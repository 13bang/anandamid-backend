import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class UserService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  // ================= REGISTER =================
  async register(dto: any) {
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Email sudah terdaftar!');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = this.userRepo.create({
      full_name: dto.full_name,
      email: dto.email,
      password: hashedPassword,
      phone_number: dto.phone_number,
    });

    const savedUser = await this.userRepo.save(newUser);
    const { password, ...result } = savedUser;
    return result;
  }

  // ================= LOGIN =================
  async login(email: string, pass: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }
    if (!user.is_active) throw new UnauthorizedException('Akun Anda dinonaktifkan');

    const payload = { sub: user.id, email: user.email, role: 'USER' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const hashedRT = await bcrypt.hash(refreshToken, 10);
    
    await this.userRepo.update(user.id, { hashed_refresh_token: hashedRT });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        avatar_url: user.avatar_url, // Return avatar juga ke frontend
      },
    };
  }

  // ================= LOGOUT =================
  async logout(userId: string) {
    await this.userRepo.update(userId, { hashed_refresh_token: null });
    return { message: 'Berhasil logout' };
  }

  // ================= REFRESH TOKEN =================
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });

      if (!user || !user.hashed_refresh_token) throw new UnauthorizedException();
      
      const isMatch = await bcrypt.compare(refreshToken, user.hashed_refresh_token);
      if (!isMatch) throw new UnauthorizedException('Refresh token tidak valid');

      const newPayload = { sub: user.id, email: user.email, role: 'USER' };
      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '1h' });

      return { access_token: newAccessToken, expires_in: 3600 };
    } catch (err) {
      throw new UnauthorizedException('Token tidak valid atau expired');
    }
  }

  // ================= GOOGLE LOGIN =================
  async googleLogin(token: string) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new UnauthorizedException('Token Google tidak valid');
      const payload = await response.json();
      if (!payload || !payload.email) throw new UnauthorizedException('Gagal mendapatkan email');

      // Ambil picture dari payload Google
      const { email, name, picture } = payload;

      let user = await this.userRepo.findOne({ where: { email } });

      if (!user) {
        const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const newUser = this.userRepo.create({
          email: email,
          full_name: name || 'Google User',
          password: hashedPassword,
          avatar_url: picture, // Simpan gambar Google ke database
        });
        user = await this.userRepo.save(newUser);
      } else if (!user.avatar_url && picture) {
        // Jika user udah ada tapi belum punya foto, update pakai foto Google
        user.avatar_url = picture;
        await this.userRepo.save(user);
      }

      if (!user.is_active) throw new UnauthorizedException('Akun Anda dinonaktifkan');

      const jwtPayload = { sub: user.id, email: user.email, role: 'USER' };
      const accessToken = this.jwtService.sign(jwtPayload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(jwtPayload, { expiresIn: '7d' });
      const hashedRT = await bcrypt.hash(refreshToken, 10);
      
      await this.userRepo.update(user.id, { hashed_refresh_token: hashedRT });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          avatar_url: user.avatar_url,
        },
      };
    } catch (error) {
      console.error("Google Login Error:", error);
      throw new UnauthorizedException('Gagal autentikasi dengan Google');
    }
  }

  // ================= GET PROFILE =================
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      select: ['id', 'full_name', 'email', 'phone_number', 'address', 'avatar_url'] 
    });

    if (!user) throw new UnauthorizedException('User tidak ditemukan');
    return user;
  }

  // ================= UPDATE PROFILE =================
  async updateProfile(userId: string, dto: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    if (dto.full_name) user.full_name = dto.full_name;
    if (dto.phone_number !== undefined) user.phone_number = dto.phone_number;
    if (dto.address !== undefined) user.address = dto.address;
    if (dto.avatar_url !== undefined) user.avatar_url = dto.avatar_url;

    await this.userRepo.save(user);

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      address: user.address,
      avatar_url: user.avatar_url,
    };
  }

  // ================= UPDATE AVATAR =================
  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User tidak ditemukan');

    user.avatar_url = avatarUrl;
    await this.userRepo.save(user);

    return {
      message: 'Avatar berhasil diupdate',
      avatar_url: avatarUrl,
    };
  }
}