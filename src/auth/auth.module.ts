import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { AdminModule } from '../admin/admin.module';
import { JwtStrategy } from './strategies/jwt.strategies';
import { AdminLogModule } from '../admin-log/admin-log.module';

@Module({
  imports: [
    AdminModule,
    AdminLogModule,
    ConfigModule, 
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        
        if (!secret) {
          throw new Error('FATAL: JWT_SECRET environment variable is missing in AuthModule!');
        }

        return {
          secret: secret,
          signOptions: { expiresIn: '15m' }, 
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}