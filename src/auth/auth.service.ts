import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
  ) {}

    async login(username: string, password: string) {
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

    return {
        message: 'Login successful',
        access_token: this.jwtService.sign(payload),
        expires_in: expiresIn,
    };
    }
}
