import { Module } from '@nestjs/common';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from 'src/product/entities/product.entity';
import { Category } from 'src/category/entities/category.entity';
import { ProductImage } from 'src/product-image/entities/product-image.entity';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage]),

    ProductModule,
  ],
  controllers: [ProductImportController],
  providers: [ProductImportService],
})
export class ProductImportModule {}