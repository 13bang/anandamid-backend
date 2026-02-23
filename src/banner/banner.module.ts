import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerImage } from './entities/banner.entity';
import { BannerImageService } from './banner.service';
import { BannerImageController } from './banner.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BannerImage])],
  controllers: [BannerImageController],
  providers: [BannerImageService],
})
export class BannerImageModule {}