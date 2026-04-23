import { Controller, Post, Body, Req, UseGuards, Patch, Param, Get, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CheckoutCartDto, CheckoutDirectDto, CheckoutBuilderDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtUserGuard } from '../user/guards/jwt-user.guard'; 
import { JwtAuthGuard } from '../auth/guards/jwt.guards'; 

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ====================== ENDPOINT USER (PEMBELI) ======================

  @UseGuards(JwtUserGuard)
  @Post('checkout/cart')
  async checkoutCart(@Req() req: any, @Body() dto: CheckoutCartDto) {
    return this.orderService.checkoutFromCart(req.user.id, dto);
  }

  @UseGuards(JwtUserGuard)
  @Post('checkout/direct')
  async checkoutDirect(@Req() req: any, @Body() dto: CheckoutDirectDto) {
    return this.orderService.checkoutDirect(req.user.id, dto);
  }

  @UseGuards(JwtUserGuard)
  @Get('my-orders')
  async getMyOrders(@Req() req: any) {
    return this.orderService.findMyOrders(req.user.id);
  }

  @UseGuards(JwtUserGuard)
  @Patch(':id/cancel')
  async cancelMyOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.orderService.cancelOrderUser(req.user.id, orderId);
  }

  // ====================== ENDPOINT ADMIN ======================
  
  @UseGuards(JwtAuthGuard) 
  
  @Patch(':id/status')
  async updateStatus(
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.orderService.updateOrderStatus(orderId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  async getAllOrders(@Query() query: any) {
    return this.orderService.findAllOrders(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderDetail(@Param('id') id: string) {
    return this.orderService.findOneOrder(id); 
  }

  @UseGuards(JwtUserGuard)
  @Post('checkout/builder')
  async checkoutBuilder(@Req() req: any, @Body() dto: CheckoutBuilderDto) {
    return this.orderService.checkoutPCBuilder(req.user.id, dto);
  }
}