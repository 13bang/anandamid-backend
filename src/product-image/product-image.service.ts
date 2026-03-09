import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from './entities/product-image.entity';
import { Product } from '../product/entities/product.entity';

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class ProductImageService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly repo: Repository<ProductImage>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private uploadBasePath = path.join(process.cwd(), 'uploads', 'products');
  private originalPath = path.join(this.uploadBasePath, 'original');
  private thumbPath = path.join(this.uploadBasePath, 'thumbnails');

  private ensureDirectories() {
    if (!fs.existsSync(this.originalPath)) {
      fs.mkdirSync(this.originalPath, { recursive: true });
    }

    if (!fs.existsSync(this.thumbPath)) {
      fs.mkdirSync(this.thumbPath, { recursive: true });
    }
  }

  private async saveImage(buffer: Buffer, fileName: string) {
    const originalFile = path.join(this.originalPath, fileName);
    const thumbFile = path.join(this.thumbPath, fileName);

    await sharp(buffer)
      .jpeg({ quality: 90 })
      .toFile(originalFile);

    return {
      original: `/uploads/products/original/${fileName}`,
      thumbFile,
      thumb: `/uploads/products/thumbnails/${fileName}`,
    };
  }

  async create(productId: string, file: Express.Multer.File) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['images'],
    });

    if (!product) throw new NotFoundException('Product not found');
    if (!file) throw new BadRequestException('File not found');

    this.ensureDirectories();

    const fileName = `${uuidv4()}.jpg`;

    const saved = await this.saveImage(file.buffer, fileName);

    let thumbnailUrl: string | null = null;

    // jika ini gambar pertama
    if (!product.images || product.images.length === 0) {
      await sharp(file.buffer)
        .resize(300, 300, { fit: 'inside' })
        .jpeg({ quality: 75 })
        .toFile(saved.thumbFile);

      thumbnailUrl = saved.thumb;
    }

    const image = this.repo.create();

    image.image_url = saved.original;
    image.thumbnail_url = thumbnailUrl;
    image.sort_order = product.images?.length || 0;
    image.product = product;

    return this.repo.save(image);
  }

  async findAll() {
    return this.repo.find({
      relations: ['product'],
      order: { sort_order: 'ASC' },
    });
  }

  async findOne(id: string) {
    const image = await this.repo.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    return image;
  }

  async update(id: string, file: Express.Multer.File) {
    const image = await this.repo.findOne({
      where: { id },
      relations: ['product', 'product.images'],
    });

    if (!image) throw new NotFoundException('Image not found');
    if (!file) throw new BadRequestException('File not found');

    this.ensureDirectories();

    // hapus file lama
    if (image.image_url) {
      const oldOriginal = path.join(this.originalPath, path.basename(image.image_url));
      if (fs.existsSync(oldOriginal)) fs.unlinkSync(oldOriginal);
    }

    if (image.thumbnail_url) {
      const oldThumb = path.join(this.thumbPath, path.basename(image.thumbnail_url));
      if (fs.existsSync(oldThumb)) fs.unlinkSync(oldThumb);
    }

    const fileName = `${uuidv4()}.jpg`;

    const saved = await this.saveImage(file.buffer, fileName);

    const isFirstImage =
      image.product.images
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.id === image.id;

    if (isFirstImage) {
      await sharp(file.buffer)
        .resize(300, 300, { fit: 'inside' })
        .jpeg({ quality: 75 })
        .toFile(saved.thumbFile);

      image.thumbnail_url = saved.thumb;
    }

    image.image_url = saved.original;

    return this.repo.save(image);
  }

  async remove(id: string) {
    const image = await this.repo.findOne({
      where: { id },
      relations: ['product', 'product.images'],
    });

    if (!image) throw new NotFoundException('Image not found');

    if (image.image_url) {
      const file = path.join(this.originalPath, path.basename(image.image_url));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }

    if (image.thumbnail_url) {
      const file = path.join(this.thumbPath, path.basename(image.thumbnail_url));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }

    return this.repo.remove(image);
  }
}