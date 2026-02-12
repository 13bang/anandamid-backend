import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

import { Category } from './entities/category.entity';
import { Product } from '../product/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product])
  ],
  providers: [CategoryService],
  controllers: [CategoryController],
})
export class CategoryModule {}
