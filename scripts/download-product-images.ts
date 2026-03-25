import { NestFactory } from "@nestjs/core";
import { AppModule } from "src/app.module";
import { ProductService } from "src/product/product.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Product } from "src/product/entities/product.entity";
import { Repository } from "typeorm";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const productRepo = app.get<Repository<Product>>(
    getRepositoryToken(Product)
  );

  const productService = app.get(ProductService);

  const products = await productRepo.find({
    relations: ["images"],
  });

  console.log("Total products:", products.length);

  for (const product of products) {
    console.log("Processing:", product.name);

    await (productService as any).ensureImagesDownloaded(product);
  }

  console.log("DONE DOWNLOAD ALL IMAGES");

  await app.close();
}

bootstrap();