// src/user/guards/jwt-user.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtUserGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Cek apakah token valid
    if (err || !user) {
      throw err || new UnauthorizedException('Token tidak valid atau sudah expired');
    }
    
    // CEK ROLE: Tolak Admin yang nyasar ke endpoint User!
    if (user.role !== 'USER') {
      throw new UnauthorizedException('Akses ditolak! Anda bukan pelanggan.');
    }
    
    return user;
  }
}