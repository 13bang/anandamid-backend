import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannerImageService } from './banner.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

import { Patch, Body } from '@nestjs/common';

@Controller('banner-image')
export class BannerImageController {
  constructor(private readonly bannerService: BannerImageService) {}

  @Get()
  async findAll() {
    return this.bannerService.findAll();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/banner',
        filename: (req, file, callback) => {
          const uniqueName = randomUUID() + extname(file.originalname);
          callback(null, uniqueName);
        },
      }),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('slot') slot: string,
  ) {
    console.log('FILE:', file);
    console.log('SLOT:', slot);

    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    if (!slot) {
      throw new Error('Slot tidak terkirim');
    }

    const imageUrl = `/uploads/banner/${file.filename}`;
    return this.bannerService.create(imageUrl, slot);
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/banner',
        filename: (req, file, callback) => {
          const uniqueName = randomUUID() + extname(file.originalname);
          callback(null, uniqueName);
        },
      }),
    }),
  )
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/banner/${file.filename}`;
    return this.bannerService.update(id, imageUrl);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.bannerService.remove(id);
    return { message: 'Banner berhasil dihapus' };
  }

  @Patch(':id/title')
  async updateTitle(
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    return this.bannerService.updateTitle(id, title);
  }

  @Get('slot/:slot')
  async findBySlot(@Param('slot') slot: string) {
    return this.bannerService.findBySlot(slot);
  }

  @Patch(':id/slot')
  async updateSlot(
    @Param('id') id: string,
    @Body('slot') slot: string,
  ) {
    return this.bannerService.updateSlot(id, slot);
  }
}