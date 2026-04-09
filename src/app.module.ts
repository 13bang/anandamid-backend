import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProductModule } from "./product/product.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmConfig } from "./config/database.config"
import { CategoryModule } from './category/category.module';
import { ProductImageModule } from './product-image/product-image.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ProductImportModule } from './product-import/product-import.module';
import { PricelistModule } from './pricelist/pricelist.module';
import { BannerImageModule } from './banner/banner.module';
import { CertificateModule } from './certificate/certificate.module';
import { GroupingModule } from './grouping/grouping.module';
import { BrandModule } from './brand/brand.module';
import { ImageDownloadController } from './image-download/image-download.controller';
import { ImageDownloadService } from './image-download/image-download.service';
import { ImageDownloadModule } from './image-download/image-download.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => TypeOrmConfig(configService)
    }),
    ProductModule,
    CategoryModule,
    ProductImageModule,
    AuthModule,
    AdminModule,
    ProductImportModule,
    PricelistModule,
    BannerImageModule,
    CertificateModule,
    GroupingModule,
    BrandModule,
    ImageDownloadModule,
    ContactModule, 
  ],
  controllers: [AppController], 
  providers: [AppService],     
})
export class AppModule {}