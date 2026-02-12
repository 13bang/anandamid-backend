import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { findOneParams } from './dto/find-one.params';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(): Promise<Product[]> {
    return this.productService.findAllProduct();
  }

  @Get(':id')
  async findOne(@Param() params: findOneParams): Promise<Product> {
    return this.productService.findOneByParams(params.id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.createProduct(dto);
  }

  @Put(':id')
  async update(
    @Param() params: findOneParams,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProductByParams(params.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param() params: findOneParams): Promise<void> {
    await this.productService.deleteProductByParams(params.id);
  }
}
