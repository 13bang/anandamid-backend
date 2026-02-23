import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { AdminModule } from '../admin/admin.module';
import { JwtStrategy } from './strategies/jwt.strategies';
import { AdminLogModule } from '../admin-log/admin-log.module';

  @Module({
  imports: [
    AdminModule,
    AdminLogModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
