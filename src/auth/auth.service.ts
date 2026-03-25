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

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    const hashedRT = await bcrypt.hash(refreshToken, 10);

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

  async refresh(refreshToken: string) {

    try {

      const payload = this.jwtService.verify(refreshToken);

      const admin = await this.adminService.findByIdWithRT(payload.sub);

      if (!admin || !admin.hashed_refresh_token) {
        throw new UnauthorizedException('Access denied');
      }

      const match = await bcrypt.compare(
        refreshToken,
        admin.hashed_refresh_token
      );

      if (!match) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = { sub: admin.id, username: admin.username };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: '1h',
      });

      // ROTATE refresh token
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      const hashedRT = await bcrypt.hash(newRefreshToken, 10);

      await this.adminService.updateRefreshToken(admin.id, hashedRT);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
      };

    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(adminId: string) {

    await this.adminService.updateRefreshToken(adminId, null);

    return {
      message: 'Logged out',
    };
  }
}