import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: Request,
  ) {
    return this.authService.login(
      body.username,
      body.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('refresh')
  async refresh(
    @Body() body: { id: string; refresh_token: string },
  ) {
    return this.authService.refresh(body.id, body.refresh_token);
  }
  
}
