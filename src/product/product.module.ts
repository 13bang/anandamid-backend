import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity'; 
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductImage } from 'src/product-image/entities/product-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, ProductImage]) 
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
