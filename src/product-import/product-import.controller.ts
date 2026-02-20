import { Controller, Get, Res, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImportService } from './product-import.service';
import type { Response } from 'express';

@Controller('product-import')
export class ProductImportController {
  constructor(private readonly productImportService: ProductImportService) {}

  @Get('template')
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadProducts(@UploadedFile() file: Express.Multer.File) {
    // Gunakan this.productImportService, bukan this.service
    return this.productImportService.uploadProducts(file.buffer);
  }

  @Post('update')
  @UseInterceptors(FileInterceptor('file'))
  async updateProducts(@UploadedFile() file: Express.Multer.File) {
    return this.productImportService.updateProducts(file.buffer);
  }

}