import { Controller, Post, Get, Put, Delete, Body, Req, UseGuards, Param } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtUserGuard } from '../user/guards/jwt-user.guard';

// @ApiTags('Cart')
@UseGuards(JwtUserGuard)
@Controller('cart')
export class CartController {
    constructor(private readonly cartService: CartService) {}

    @Get()
    async getMyCart(@Req() req: any) {
        return this.cartService.getMyCart(req.user.id);
    }

    @Post('add')
    async addToCart(@Req() req: any, @Body() body: { product_id: string, quantity: number, variasi?: string }) {
        return this.cartService.addToCart(req.user.id, body.product_id, body.quantity, body.variasi);
    }

    @Put('update/:id')
    async updateQuantity(
        @Req() req: any, 
        @Param('id') cartId: string, 
        @Body('quantity') quantity: number
    ) {
        return this.cartService.updateQuantity(req.user.id, cartId, quantity);
    }

    @Delete('remove/:id')
    async removeFromCart(@Req() req: any, @Param('id') cartId: string) {
        return this.cartService.removeFromCart(req.user.id, cartId);
    }

    @Delete('clear')
    async clearCart(@Req() req: any) {
        return this.cartService.clearCart(req.user.id);
    }
}