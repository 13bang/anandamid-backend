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
  Query,
} from '@nestjs/common';

import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create.product.dto';
import { UpdateProductDto } from './dto/update.product.dto';
import { findOneParams } from './dto/find-one.params';
import { Product } from './entities/product.entity';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';
import { CreateProductResponse } from '../../src/product/interface/product.interface';

@Controller('admin/products') 
@UseGuards(JwtAuthGuard)      
export class AdminProductController {
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
  async create(
    @Body() dto: CreateProductDto,
  ): Promise<CreateProductResponse> {
    return this.productService.createProduct(dto);
  }

  @Put(':id')
  async update(
    @Param() params: findOneParams,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProductByParams(params.id, dto);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  async bulkDelete(@Body() body: { ids: string[] }) {
    await this.productService.bulkDelete(body.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param() params: findOneParams): Promise<void> {
    await this.productService.deleteProductByParams(params.id);
  }

}
