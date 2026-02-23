import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminLogService } from 'src/admin-log/admin-log.service';

@Injectable()
export class AuthService {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
    private adminLogService: AdminLogService,
  ) {}

  async login(username: string, password: string, ip?: string, userAgent?: string) {
    const admin = await this.adminService.findByUsername(username);

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: admin.id, username: admin.username };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const salt = await bcrypt.genSalt();
    const hashedRT = await bcrypt.hash(refreshToken, salt);
    
    await this.adminService.updateRefreshToken(admin.id, hashedRT);

    await this.adminLogService.logLogin(admin.id, ip, userAgent);

    return {
      access_token: accessToken,
      refresh_token: refreshToken, 
      expires_in: 3600,
      user: {
        id: admin.id,
        username: admin.username,
      },
    };
  }

  // Fungsi baru untuk menukar Refresh Token dengan Access Token baru
  async refresh(adminId: string, refreshToken: string) {
    // Ambil admin beserta kolom hashed_refresh_token (karena defaultnya false)
    const admin = await this.adminService.findByIdWithRT(adminId);
    
    if (!admin || !admin.hashed_refresh_token) {
      throw new UnauthorizedException('Access Denied');
    }

    // Bandingkan token yang dikirim dengan yang ada di DB
    const isMatch = await bcrypt.compare(refreshToken, admin.hashed_refresh_token);
    if (!isMatch) throw new UnauthorizedException('Invalid Refresh Token');

    // Buat Access Token baru
    const payload = { sub: admin.id, username: admin.username };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      access_token: newAccessToken,
      expires_in: 3600
    };
  }
}