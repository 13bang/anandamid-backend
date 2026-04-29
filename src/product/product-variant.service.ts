import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '../product/entities/product-variant.entity';

@Injectable()
export class ProductVariantService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async updateVariant(id: string, dto: any): Promise<ProductVariant> {
    const variant = await this.variantRepository.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');

    // Hanya field yang boleh diupdate via inline edit
    const allowedFields = ['price_normal', 'price_discount', 'stock', 'sku_seller', 'variant_name'];
    
    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        (variant as any)[field] = dto[field];
      }
    }

    return this.variantRepository.save(variant);
  }

  async deleteVariant(id: string): Promise<void> {
    const variant = await this.variantRepository.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');
    await this.variantRepository.remove(variant);
  }
}