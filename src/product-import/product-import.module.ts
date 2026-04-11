import { Module } from '@nestjs/common';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from 'src/product/entities/product.entity';
import { Category } from 'src/category/entities/category.entity';
import { ProductImage } from 'src/product-image/entities/product-image.entity';
import { ProductModule } from 'src/product/product.module';
import { Brand } from 'src/brand/entities/brand.entity';
import { TemplateCacheService } from './template-cache.service'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage, Brand]),
    ProductModule,
  ],
  controllers: [ProductImportController],
  providers: [
    ProductImportService,
    TemplateCacheService, 
  ],
})
export class ProductImportModule {}