import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from './entities/product-image.entity';
import { Product } from '../product/entities/product.entity';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImageService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly repo: Repository<ProductImage>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateProductImageDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.repo.delete({
      product: { id: dto.productId },
    });

    // 🔥 INSERT YANG BARU
    const imagesToSave: ProductImage[] = dto.imageUrl.map((url) =>
      this.repo.create({
        image_url: url,
        product,
      }),
    );

    return this.repo.save(imagesToSave);
  }

  async findAll() {
    return await this.repo.find({
      relations: ['product'],
    });
  }

  async findOne(id: string) {
    const image = await this.repo.findOne({
      where: { id }, // ❗ uuid string, jangan Number()
      relations: ['product'],
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    return image;
  }

  async update(id: string, dto: UpdateProductImageDto) {

    const image = await this.findOne(id);

    if (dto.imageUrl) {
      image.image_url = dto.imageUrl;
    }

    return await this.repo.save(image);
  }

  async remove(id: string) {
    const image = await this.findOne(id);
    return await this.repo.remove(image);
  }
}
