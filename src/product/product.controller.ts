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
  UseGuards,
} from '@nestjs/common';

import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { findOneParams } from './dto/find-one.params';
import { Product } from './entities/product.entity';
import { Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.productService.findAllProduct(query);
  }

  @Get(':id')
  async findOne(@Param() params: findOneParams): Promise<Product> {
    return this.productService.findOneByParams(params.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.createProduct(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param() params: findOneParams,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProductByParams(params.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param() params: findOneParams): Promise<void> {
    await this.productService.deleteProductByParams(params.id);
  }
}
