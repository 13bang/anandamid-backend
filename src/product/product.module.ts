import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductImage } from 'src/product-image/entities/product-image.entity';
import { AdminProductController } from './admin-product.controller';
import { PublicProductController } from './public-product.controller';
import { Brand } from 'src/brand/entities/brand.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage, Brand]) 
  ],
  controllers: [AdminProductController, PublicProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
