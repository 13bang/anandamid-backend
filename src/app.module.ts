import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProductModule } from "./product/product.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmConfig } from "./config/database.config"
import { CategoryModule } from './category/category.module';
import { ProductImageModule } from './product-image/product-image.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), 
  TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => TypeOrmConfig(configService)
  }),
  ProductModule,
  CategoryModule,
  ProductImageModule], 
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}