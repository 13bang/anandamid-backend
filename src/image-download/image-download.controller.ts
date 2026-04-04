import { Controller, Get, Param, UnauthorizedException } from '@nestjs/common';
import { ImageDownloadService } from './image-download.service';

@Controller('tools')
export class ImageDownloadController {
  constructor(private readonly downloadService: ImageDownloadService) {}

  // URL yang diakses: GET /api/v1/tools/download-images/PASSWORD_LU
  @Get('download-images/:password')
  triggerDownload(@Param('password') password: string) {
    // Ganti ini pake password rahasia lu atau ambil dari .env (process.env.SYNC_PASSWORD)
    const SECRET_PASSWORD = 'apip-kalcer-123'; 

    if (password !== SECRET_PASSWORD) {
      throw new UnauthorizedException('Salah password bos!');
    }

    return this.downloadService.startDownloadProcess();
  }
}