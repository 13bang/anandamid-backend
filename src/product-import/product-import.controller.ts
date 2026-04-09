import { Controller, Get, Res, Post, UploadedFile, UseInterceptors, UseGuards, Sse, Query } from '@nestjs/common';
import { Observable, map } from 'rxjs';
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

  @Get('template-update')
  @UseGuards(JwtAuthGuard)
  async downloadUpdateTemplate(
    @Query('category_code') categoryCode: string,
    @Query('only_with_sku') onlyWithSku: string, // Ambil dari query
    @Res() res: Response
  ) {
    const categoryCodes = categoryCode ? categoryCode.split(',') : undefined;
    
    // Konversi string 'true'/'false' ke boolean murni
    const isOnlySku = onlyWithSku === undefined ? true : onlyWithSku === 'true';

    const buffer = await this.productImportService.generateUpdateTemplate(categoryCodes, isOnlySku);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=product-update-template.xlsx',
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

  @Sse('progress')
  progress(): Observable<MessageEvent> {
    return this.productImportService.progress$.pipe(
      map((msg) => {
        return {
          data: msg,
        } as MessageEvent;
      }),
    );
  }

}