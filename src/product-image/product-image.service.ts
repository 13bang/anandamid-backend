import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from './entities/product-image.entity';
import { Product } from '../product/entities/product.entity';
// import { CreateProductImageDto } from './dto/create-product-image.dto';
// import { UpdateProductImageDto } from './dto/update-product-image.dto';

// import axios from 'axios';
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

  async create(productId: string, file: Express.Multer.File) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!file) {
      throw new NotFoundException('File not found');
    }

    this.ensureDirectories();

    const fileName = `${uuidv4()}.jpg`;

    const originalFile = path.join(this.originalPath, fileName);
    const thumbFile = path.join(this.thumbPath, fileName);

    // Save original
    await sharp(file.buffer)
      .jpeg({ quality: 90 })
      .toFile(originalFile);

    // Generate thumbnail
    await sharp(file.buffer)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 75 })
      .toFile(thumbFile);

    const image = this.repo.create({
      image_url: `/uploads/products/original/${fileName}`,
      thumbnail_url: `/uploads/products/thumbnails/${fileName}`,
      sort_order: 0,
      product,
    });

    return this.repo.save(image);
    }

  async findAll() {
    return await this.repo.find({
      relations: ['product'],
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
  const image = await this.findOne(id);

  if (!file) {
    throw new NotFoundException('File not found');
  }

  const basePath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'uploads',
    'products'
  );

  const originalPath = path.join(basePath, 'original');
  const thumbPath = path.join(basePath, 'thumbnails');

  if (!fs.existsSync(originalPath)) {
    fs.mkdirSync(originalPath, { recursive: true });
  }

  if (!fs.existsSync(thumbPath)) {
    fs.mkdirSync(thumbPath, { recursive: true });
  }

  if (image.image_url) {
    const oldOriginal = path.join(originalPath, path.basename(image.image_url));
    const oldThumb = path.join(thumbPath, path.basename(image.thumbnail_url || ''));

    if (fs.existsSync(oldOriginal)) fs.unlinkSync(oldOriginal);
    if (fs.existsSync(oldThumb)) fs.unlinkSync(oldThumb);
  }

  const fileExt = file.originalname.split('.').pop() || 'jpg';
  const fileName = `${uuidv4()}.${fileExt}`;

  const originalFile = path.join(originalPath, fileName);
  const thumbFile = path.join(thumbPath, fileName);

  fs.writeFileSync(originalFile, file.buffer);

  await sharp(file.buffer)
    .resize(300, 300, { fit: 'inside' })
    .jpeg({ quality: 75 })
    .toFile(thumbFile);

  image.image_url = `/uploads/products/original/${fileName}`;
  image.thumbnail_url = `/uploads/products/thumbnails/${fileName}`;

  return await this.repo.save(image);
}

  async remove(id: string) {
    const image = await this.findOne(id);
    return await this.repo.remove(image);
  }
}
