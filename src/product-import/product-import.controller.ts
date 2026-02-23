import { Controller, Get, Res, Post, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImportService } from './product-import.service';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guards';

@Controller('product-import')
export class ProductImportController {
  constructor(private readonly productImportService: ProductImportService) {}

  @Get('template')
  @UseGuards(JwtAuthGuard)
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.productImportService.generateTemplate();

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=product_template.xlsx',
    });

    res.send(buffer);
  }

@Post('upload')
@UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProducts(@UploadedFile() file: Express.Multer.File) {
    return this.productImportService.uploadProducts(file.buffer);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateProducts(@UploadedFile() file: Express.Multer.File) {
    return this.productImportService.updateProducts(file.buffer);
  }

}