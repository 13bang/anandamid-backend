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

    async createCategory(dto: CreateCategoryDto): Promise<Category> {

        const existing = await this.categoryRepository.findOne({
            where: [
                { name: dto.name },
                { code: dto.code }
            ]
        });

        if (existing) {
            throw new ConflictException('Category name or code already exists');
        }

        const category = this.categoryRepository.create(dto);
        return await this.categoryRepository.save(category);
    }


    async findAllCategory() {

        const categories = await this.categoryRepository
            .createQueryBuilder('category')
            .leftJoin('category.products', 'product')
            .select('category.id', 'id')
            .addSelect('category.name', 'name')
            .addSelect('category.code', 'code')
            .addSelect('COUNT(product.id)', 'total_products')
            .groupBy('category.id')
            .getRawMany();

        return categories;
    }

    async findOneCategory(id: string) {

        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['products'],
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return {
            id: category.id,
            name: category.name,
            code: category.code,
            total_products: category.products.length,
            products: category.products.map(p => ({
                id: p.id,
                name: p.name,
                normal_price: p.price_normal,
                discount_price: p.price_discount,
                final_price: p.final_price,
            }))
        };
    }

    async updateCategory(id: string, dto: UpdateCategoryDto) {

        const category = await this.categoryRepository.findOne({
            where: { id }
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        if (dto.code) {
            const existingCode = await this.categoryRepository.findOne({
                where: { code: dto.code }
            });

            if (existingCode && existingCode.id !== id) {
                throw new ConflictException('Category code already exists');
            }
        }

        Object.assign(category, dto);

        return await this.categoryRepository.save(category);
    }

    async deleteCategory(id: string): Promise<void> {
        await this.categoryRepository.delete(id);
    }
}
