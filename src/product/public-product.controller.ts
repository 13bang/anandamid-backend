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

  @Get("compatibility")
  getCompatibility(@Query() query) {
    return this.productService.getCompatibilityBuilder(query);
  }

  @Get(':id/recommendations')
  getRecommendations(@Param('id') id: string) {
    return this.productService.getRecommendations(id);
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
