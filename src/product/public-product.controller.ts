import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';

import { ProductService } from './product.service';

@Controller('products')
export class PublicProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.productService.findActiveProducts(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productService.findOneByParams(id);

    if (!product.is_active) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
