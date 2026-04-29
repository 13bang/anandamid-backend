import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Cart, Product, ProductVariant]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}