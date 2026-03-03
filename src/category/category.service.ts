import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { Product } from '../product/entities/product.entity';

import { ConflictException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create.category.dto';
import { UpdateCategoryDto } from './dto/update.category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  // Tambahkan | null agar sinkron dengan Controller
  async createCategory(dto: CreateCategoryDto, imagePath?: string | null): Promise<Category> {
    const existing = await this.categoryRepository.findOne({
      where: [{ name: dto.name }, { code: dto.code }],
    });

    if (existing) {
      throw new ConflictException('Category name or code already exists');
    }

    // Pastikan dto di-spread (...) dan image_url diisi manual
    const category = this.categoryRepository.create({
      name: dto.name,
      code: dto.code,
      image_url: imagePath,
    });

    return await this.categoryRepository.save(category);
  }

async findAllCategory() {
  const categories = await this.categoryRepository
    .createQueryBuilder('category')
    .select([
      'category.id AS id',
      'category.name AS name',
      'category.code AS code',
      'category.image_url AS image_url',
    ])
    .addSelect(subQuery => {
      return subQuery
        .select('COUNT(product.id)', 'total')
        .from(Product, 'product')
        .leftJoin('product.category', 'cat')
        .where('cat.id = category.id')
        .orWhere(qb => {
          const sub = qb
            .subQuery()
            .select('child.id')
            .from(Category, 'child')
            .where('child.parent_id = category.id')
            .getQuery();
          return 'cat.id IN ' + sub;
        });
    }, 'total_products')
    .getRawMany();

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    code: cat.code,
    image_url: cat.image_url,
    total_products: Number(cat.total_products),
  }));
}

  async findOneCategory(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!category) throw new NotFoundException('Category not found');

    return {
      id: category.id,
      name: category.name,
      code: category.code,
      image_url: category.image_url,
      total_products: category.products.length,
      products: category.products.map((p) => ({
        id: p.id,
        name: p.name,
        final_price: p.final_price,
      })),
    };
  }

  // Tambahkan | null agar sinkron dengan Controller
  async updateCategory(id: string, dto: UpdateCategoryDto, imagePath?: string | null) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (imagePath) {
      category.image_url = imagePath;
    }

    Object.assign(category, dto);
    return await this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Category not found');
  }
}
