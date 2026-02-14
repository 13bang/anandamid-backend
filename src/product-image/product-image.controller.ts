import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProductImageService } from './product-image.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';

@Controller('product-images')
export class ProductImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateProductImageDto) {
    return this.productImageService.create(dto);
  }

  @Get()
  findAll() {
    return this.productImageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productImageService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImageService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.productImageService.remove(id);
  }
}

