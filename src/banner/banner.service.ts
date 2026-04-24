import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerImage } from './entities/banner.entity';
import { Category } from '../category/entities/category.entity';
import { Brand } from '../brand/entities/brand.entity';

@Injectable()
export class BannerImageService {
  constructor(
    @InjectRepository(BannerImage)
    private readonly bannerRepo: Repository<BannerImage>,
  ) {}

  async findAll(): Promise<BannerImage[]> {
    return this.bannerRepo.find({
      order: { created_at: 'ASC' },
      relations: ['categories', 'brands'], // Load relasi biar muncul di response API
    });
  }

  async findOne(id: string): Promise<BannerImage> {
    const banner = await this.bannerRepo.findOne({ 
      where: { id },
      relations: ['categories', 'brands'],
    });
    
    if (!banner) {
      throw new NotFoundException('Banner tidak ditemukan');
    }
    return banner;
  }

  async create(
    image_url: string, 
    slot: string, 
    categoryIds?: string[], 
    brandIds?: string[],
    promo?: string // <--- Ubah dari target_url ke promo
  ): Promise<BannerImage> {
    if (!slot || !slot.trim()) {
      throw new Error('Slot wajib diisi');
    }

    const banner = this.bannerRepo.create({
      image_url,
      slot: slot.trim(),
      promo: promo ? promo : undefined, // <--- Hindari error null TypeScript
    });

    if (categoryIds && categoryIds.length > 0) {
      banner.categories = categoryIds.map(id => ({ id } as Category));
    }

    if (brandIds && brandIds.length > 0) {
      banner.brands = brandIds.map(id => ({ id } as Brand));
    }

    return this.bannerRepo.save(banner);
  }

  async update(
    id: string, 
    image_url: string, 
    categoryIds?: string[], 
    brandIds?: string[],
    promo?: string // <--- Ditambahin juga biar bisa update promo
  ): Promise<BannerImage> {
    const banner = await this.findOne(id);
    banner.image_url = image_url;

    if (promo !== undefined) {
      banner.promo = promo;
    }

    if (categoryIds !== undefined) {
      banner.categories = categoryIds.map(id => ({ id } as Category));
    }

    if (brandIds !== undefined) {
      banner.brands = brandIds.map(id => ({ id } as Brand));
    }

    return this.bannerRepo.save(banner);
  }

  async remove(id: string): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannerRepo.remove(banner);
  }

  async updateTitle(id: string, title: string): Promise<BannerImage> {
    const banner = await this.findOne(id);

    banner.title = title;
    return this.bannerRepo.save(banner);
  }

  async findBySlot(slot: string): Promise<BannerImage | null> {
    return this.bannerRepo.findOne({
      where: { slot },
    });
  }

  async updateSlot(id: string, slot: string): Promise<BannerImage> {
    const banner = await this.findOne(id);
    banner.slot = slot.trim();
    return this.bannerRepo.save(banner);
  }

  async updateMetadata(
    id: string,
    data: { slot?: string; promo?: string; categoryIds?: string[]; brandIds?: string[] }
  ): Promise<BannerImage> {
    const banner = await this.findOne(id);

    if (data.slot) banner.slot = data.slot.trim();
    if (data.promo !== undefined) banner.promo = data.promo;

    if (data.categoryIds !== undefined) {
      banner.categories = data.categoryIds.map(id => ({ id } as Category));
    }

    if (data.brandIds !== undefined) {
      banner.brands = data.brandIds.map(id => ({ id } as Brand));
    }

    return this.bannerRepo.save(banner);
  }
}