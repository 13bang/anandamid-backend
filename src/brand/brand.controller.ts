import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UploadedFile,
  UseInterceptors,
  Patch,
  Query, // 🔥 Jangan lupa import Query
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import { BrandService } from "./brand.service";
import { UpdateBrandDto } from "./dto/update-brand.dto";

const brandStorage = diskStorage({
  destination: "./uploads/brands",
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      extname(file.originalname);

    cb(null, uniqueName);
  },
});

@Controller("brands")
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image", { storage: brandStorage }))
  create(
    @Body("name") name: string,
    @Body("is_active") isActiveStr?: string, 
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imagePath = file
      ? `/uploads/brands/${file.filename}`
      : null;

    const is_active = isActiveStr === 'true';

    return this.brandService.create({ name, is_active }, imagePath);
  }

  @Get()
  findAll(@Query('is_active') isActive?: string) { 
    return this.brandService.findAll(isActive);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.brandService.findOne(id);
  }

  @Put(":id")
  @UseInterceptors(FileInterceptor("image", { storage: brandStorage }))
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBrandDto & { is_active?: string }, 
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imagePath = file
      ? `/uploads/brands/${file.filename}`
      : undefined;

    return this.brandService.update(id, dto, imagePath);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.brandService.delete(id);
  }

  @Patch(":id/assign-products")
  assignProducts(
    @Param("id") id: string,
    @Body("product_ids") productIds: string[],
  ) {
    return this.brandService.assignProducts(id, productIds);
  }
}