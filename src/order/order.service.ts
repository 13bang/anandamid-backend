import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { CheckoutCartDto, CheckoutDirectDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
    constructor(
        @InjectRepository(Order) private orderRepo: Repository<Order>,
        @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
        @InjectRepository(Cart) private cartRepo: Repository<Cart>,
        @InjectRepository(Product) private productRepo: Repository<Product>,
    ) {}

    // ====================== GENERATOR INVOICE ======================
    private generateInvoiceNumber(): string {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `INV-${dateStr}-${randomNum}`;
    }

    // ====================== CHECKOUT VIA CART ======================
    async checkoutFromCart(userId: string, dto: CheckoutCartDto) {
        const cartItems = await this.cartRepo.find({
            where: { 
                id: In(dto.cart_ids),
                user_id: userId 
            },
            relations: ['product'],
        });

        if (cartItems.length === 0) {
            throw new BadRequestException('Item keranjang tidak ditemukan atau sudah dihapus.');
        }

        let totalPrice = 0;
        const orderItems: Partial<OrderItem>[] = [];

        for (const cart of cartItems) {
            if (!cart.product) continue;

            if (cart.product.stock < cart.quantity) {
                throw new BadRequestException(`Stok produk ${cart.product.name} tidak mencukupi.`);
            }

            const priceNormal = Number(cart.product.price_normal || 0);
            const priceDiscount = Number(cart.product.price_discount || 0);
            const finalPrice = priceDiscount > 0 ? priceNormal - priceDiscount : priceNormal;

            totalPrice += finalPrice * cart.quantity;

            orderItems.push({
                product: { id: cart.product.id } as Product,
                product_name: cart.product.name,
                variasi: cart.selected_variasi,
                quantity: cart.quantity,
                price: finalPrice,
            });
        }

        const newOrder = this.orderRepo.create({
            user: { id: userId },
            invoice_number: this.generateInvoiceNumber(),
            total_price: totalPrice,
            notes: dto.notes,
            items: orderItems as OrderItem[], 
        });

        const savedOrder = await this.orderRepo.save(newOrder);
        await this.cartRepo.delete(dto.cart_ids);

        return {
            message: 'Checkout keranjang berhasil',
            order: savedOrder,
        };
    }

    // ====================== CHECKOUT BELI LANGSUNG ======================
    async checkoutDirect(userId: string, dto: CheckoutDirectDto) {
        const product = await this.productRepo.findOne({ where: { id: dto.product_id } });

        if (!product) {
            throw new NotFoundException('Produk tidak ditemukan');
        }

        if (product.stock < dto.quantity) {
            throw new BadRequestException(`Stok produk ${product.name} hanya tersisa ${product.stock}`);
        }

        const priceNormal = Number(product.price_normal || 0);
        const priceDiscount = Number(product.price_discount || 0);
        const finalPrice = priceDiscount > 0 ? priceNormal - priceDiscount : priceNormal;

        const totalPrice = finalPrice * dto.quantity;

        const orderItem: Partial<OrderItem> = {
            product: { id: product.id } as Product,
            product_name: product.name,
            variasi: dto.variasi || null,
            quantity: dto.quantity,
            price: finalPrice,
        };

        const newOrder = this.orderRepo.create({
            user: { id: userId },
            invoice_number: this.generateInvoiceNumber(),
            total_price: totalPrice,
            notes: dto.notes,
            items: [orderItem as OrderItem],
        });

        const savedOrder = await this.orderRepo.save(newOrder);

        return {
            message: 'Checkout langsung berhasil',
            order: savedOrder,
        };
    }

    // ====================== RIWAYAT PESANAN USER ======================
    async findMyOrders(userId: string) {
        const orders = await this.orderRepo.find({
            where: { user: { id: userId } },
            relations: ['items', 'items.product', 'items.product.images'], // 🔥 Tambahkan images
            order: { created_at: 'DESC' },
        });

        // 🔥 Mapping agar format product punya field 'thumbnail'
        return orders.map((order) => {
            return {
                ...order,
                items: order.items.map((item) => {
                    let thumbnail: string | null = null;
                    if (item.product && item.product.images && item.product.images.length > 0) {
                        const mainImage = item.product.images.find((img) => img.sort_order === 0) || item.product.images[0];
                        thumbnail = mainImage.thumbnail_url || null; // Sesuaikan dengan penamaan kolom di DB
                    }

                    return {
                        ...item,
                        product: item.product ? {
                            ...item.product,
                            thumbnail: thumbnail, // Menyisipkan thumbnail ke object product
                        } : null,
                    };
                }),
            };
        });
    }

    // ====================== USER BATALKAN PESANAN ======================
    async cancelOrderUser(userId: string, orderId: string) {
        const order = await this.orderRepo.findOne({
            where: { id: orderId, user: { id: userId } },
        });

        if (!order) {
            throw new NotFoundException('Pesanan tidak ditemukan atau bukan milik Anda.');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Hanya pesanan berstatus PENDING yang dapat dibatalkan.');
        }

        order.status = 'BATAL';
        const updatedOrder = await this.orderRepo.save(order);

        return {
            message: 'Pesanan berhasil dibatalkan',
            order: updatedOrder,
        };
    }

    // ====================== UPDATE STATUS OLEH ADMIN ======================
    async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
        const order = await this.orderRepo.findOne({
            where: { id: orderId },
            relations: ['items', 'items.product'], 
        });

        if (!order) {
            throw new NotFoundException('Pesanan tidak ditemukan');
        }

        if (order.status === 'PENDING' && dto.status === 'LUNAS') {
            for (const item of order.items) {
                if (item.product) {
                    if (item.product.stock < item.quantity) {
                        throw new BadRequestException(`Gagal: Stok produk ${item.product.name} tidak mencukupi untuk pesanan ini.`);
                    }
                    item.product.stock -= item.quantity;
                    await this.productRepo.save(item.product);
                }
            }
        }

        if (order.status === 'LUNAS' && dto.status === 'BATAL') {
            for (const item of order.items) {
                if (item.product) {
                    item.product.stock += item.quantity;
                    await this.productRepo.save(item.product);
                }
            }
        }

        order.status = dto.status;
        const updatedOrder = await this.orderRepo.save(order);

        return {
            message: `Status pesanan berhasil diubah menjadi ${dto.status}`,
            order: updatedOrder,
        };
    }

    async findAllOrders(query: any) {
        const qb = this.orderRepo.createQueryBuilder('order')
            .leftJoinAndSelect('order.user', 'user')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('items.product', 'product') // 🔥 Tarik product
            .leftJoinAndSelect('product.images', 'images') // 🔥 Tarik images
            .orderBy('order.created_at', 'DESC');

        if (query.status) {
            qb.andWhere('order.status = :status', { status: query.status });
        }

        const [data, total] = await qb.getManyAndCount();

        const mappedData = data.map((order) => {
            order.items = order.items.map((item) => {
                let thumbnail: string | null = null;
                if (item.product && item.product.images && item.product.images.length > 0) {
                    const mainImage = item.product.images.find((img) => img.sort_order === 0) || item.product.images[0];
                    thumbnail = mainImage.thumbnail_url || null;
                }
                if (item.product) {
                    (item.product as any).thumbnail = thumbnail;
                }
                return item;
            });
            return order;
        });

        return { data: mappedData, total };
    }

    async findOneOrder(id: string) {
        const order = await this.orderRepo.findOne({
            where: { id },
            relations: ['user', 'items', 'items.product', 'items.product.images'], // 🔥 Tambahkan images
        });

        if (!order) {
            throw new NotFoundException(`Pesanan dengan ID ${id} tidak ditemukan`);
        }

        order.items = order.items.map((item) => {
            let thumbnail: string | null = null;
            if (item.product && item.product.images && item.product.images.length > 0) {
                const mainImage = item.product.images.find((img) => img.sort_order === 0) || item.product.images[0];
                thumbnail = mainImage.thumbnail_url || null;
            }
            if (item.product) {
                (item.product as any).thumbnail = thumbnail;
            }
            return item;
        });

        return order;
    }
}