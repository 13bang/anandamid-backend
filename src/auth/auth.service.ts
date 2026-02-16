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

    async login(
    username: string,
    password: string,
    ip?: string,
    userAgent?: string,
    ) {
    const admin = await this.adminService.findByUsername(username);

    if (!admin) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
        sub: admin.id,
        username: admin.username,
    };

    const expiresIn = 300;

    const accessToken = this.jwtService.sign(payload, {
        expiresIn,
    });

    await this.adminLogService.logLogin(
        admin.id,
        ip,
        userAgent,
    );

    return {
        access_token: accessToken,
        expires_in: expiresIn,
    };
    }
}
