import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageDownloadController } from './image-download.controller';
import { ImageDownloadService } from './image-download.service';
import { Product } from '../product/entities/product.entity';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ProductModule, // <--- Wajib di-import biar dapet ProductService
  ],
  controllers: [ImageDownloadController],
  providers: [ImageDownloadService],
})
export class ImageDownloadModule {}