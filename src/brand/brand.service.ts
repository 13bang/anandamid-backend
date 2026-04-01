import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { Brand } from "./entities/brand.entity";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { Product } from "src/product/entities/product.entity";

@Injectable()
export class BrandService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,

    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateBrandDto, image?: string | null) {
    const exist = await this.brandRepository.findOne({
      where: { name: dto.name },
    });

    if (exist) {
      throw new ConflictException("Brand already exists");
    }

    const brand = this.brandRepository.create({
      name: dto.name,
      image_url: image || null,
    });

    return this.brandRepository.save(brand);
  }

  async findAll() {
    const brands = await this.brandRepository
      .createQueryBuilder("brand")
      .leftJoin("brand.products", "product")
      .select([
        "brand.id",
        "brand.name",
        "brand.image_url",
        "brand.created_at",
        "brand.updated_at",

        "product.id",
        "product.name",
      ])
      .orderBy("brand.name", "ASC")
      .getMany();

    return brands.map(b => ({
      ...b,
      products: b.products?.map(p => ({
        id: p.id,
        name: p.name,
      }))
    }));
  }

  async findOne(id: string) {
    const brand = await this.brandRepository.findOne({
      where: { id },
      relations: ['products'], 
    });

    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto, image?: string) {
    const brand = await this.findOne(id);

    if (dto.name) {
      const exist = await this.brandRepository.findOne({
        where: { name: dto.name },
      });

      if (exist && exist.id !== id) {
        throw new ConflictException("Brand name already used");
      }
    }

    Object.assign(brand, dto);

    if (image) {
      brand.image_url = image;
    }

    return this.brandRepository.save(brand);
  }

  async delete(id: string) {
    const brand = await this.findOne(id);

    await this.brandRepository.remove(brand);
  }

  async assignProducts(brandId: string, productIds: string[]) {
    const brand = await this.brandRepository.findOne({
      where: { id: brandId },
    });

    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    await this.productRepository.update(
      { id: In(productIds) },
      { brand: { id: brandId } as any }
    );

    return { message: "Products assigned" };
  }
}