import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Brand } from "./entities/brand.entity";
import { BrandService } from "./brand.service";
import { BrandController } from "./brand.controller";
import { Product } from "src/product/entities/product.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Brand, Product])],
  controllers: [BrandController],
  providers: [BrandService],
  exports: [BrandService],
})
export class BrandModule {}