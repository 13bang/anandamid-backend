import { Module } from '@nestjs/common';
import { ProductImportController } from './product-import.controller';
import { ProductImportService } from './product-import.service';

@Module({
  controllers: [ProductImportController],
  providers: [ProductImportService],
})
export class ProductImportModule {}