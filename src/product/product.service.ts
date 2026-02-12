import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { Product } from './entities/product.entity';
import { Category } from '../category/entities/category.entity';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {

    const category = await this.categoryRepository.findOne({
      where: { id: dto.category_id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = this.productRepository.create({
      ...dto,
      category,
    });

    return this.productRepository.save(product);
  }

  async findAllProduct(): Promise<Product[]> {
    return this.productRepository.find({
      relations: ['category', 'images'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneByParams(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'images'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProductByParams(
    id: string,
    dto: UpdateProductDto,
  ): Promise<Product> {

    const product = await this.findOneByParams(id);

    if (dto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.category_id },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      product.category = category;
    }

    Object.assign(product, dto);

    return this.productRepository.save(product);
  }

  async deleteProductByParams(id: string): Promise<void> {
    const product = await this.findOneByParams(id);
    await this.productRepository.remove(product);
  }
}
