import { Controller, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProductVariantService } from './product-variant.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guards';

@Controller('admin/products/variants')
@UseGuards(JwtAuthGuard)
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) {}

  // Inline edit dari tabel admin
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.productVariantService.updateVariant(id, dto);
  }

  // Hapus variant (opsional, untuk kebutuhan future)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productVariantService.deleteVariant(id);
  }
}