import { Controller, Post, Get, Put, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtUserGuard } from './guards/jwt-user.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('user/auth')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('register')
    async register(@Body() body: any) {
        return this.userService.register(body);
    }

    @Post('login')
    async login(@Body() body: any) {
        return this.userService.login(body.email, body.password);
    }

    @UseGuards(JwtUserGuard)
    @Post('logout')
    async logout(@Req() req: any) {
        return this.userService.logout(req.user.id);
    }

    @Post('refresh')
    async refresh(@Body() body: any) {
        return this.userService.refresh(body.refresh_token);
    }

    @Post('google')
    async googleLogin(@Body('token') token: string) {
        return this.userService.googleLogin(token);
    }

    // ================= PROFILE ENDPOINTS =================
    
    @UseGuards(JwtUserGuard)
    @Get('profile')
    async getProfile(@Req() req: any) {
        return this.userService.getProfile(req.user.id);
    }

    @UseGuards(JwtUserGuard)
    @Put('profile')
    async updateProfile(@Req() req: any, @Body() body: any) {
        return this.userService.updateProfile(req.user.id, body);
    }

    // ================= UPLOAD AVATAR ENDPOINT =================
    @UseGuards(JwtUserGuard)
    @Post('profile/avatar')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads', 
            // 1. Tambahkan tipe ': any' pada req
            filename: (req: any, file, cb) => { 
                // 2. Tambahkan safe navigation operator (?) dan fallback
                const userId = req.user?.id || 'unknown'; 
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
            },
        }),
        fileFilter: (req: any, file, cb) => { // Tambahkan : any juga di sini biar aman
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                return cb(new BadRequestException('Hanya file gambar yang diizinkan!'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 2 * 1024 * 1024 }, 
    }))
    async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('File tidak ditemukan');
        }

        const fileUrl = `/uploads/${file.filename}`;

        return this.userService.updateAvatar(req.user.id, fileUrl);
    }
}