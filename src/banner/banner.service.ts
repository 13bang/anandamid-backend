import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerImage } from './entities/banner.entity';

@Injectable()
export class BannerImageService {
  constructor(
    @InjectRepository(BannerImage)
    private readonly bannerRepo: Repository<BannerImage>,
  ) {}

  async findAll(): Promise<BannerImage[]> {
    return this.bannerRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BannerImage> {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Banner tidak ditemukan');
    }
    return banner;
  }

  async create(image_url: string): Promise<BannerImage> {
    const banner = this.bannerRepo.create({ image_url });
    return this.bannerRepo.save(banner);
  }

  async update(id: string, image_url: string): Promise<BannerImage> {
    const banner = await this.findOne(id);
    banner.image_url = image_url;
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
}