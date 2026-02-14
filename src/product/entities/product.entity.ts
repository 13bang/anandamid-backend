import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from "typeorm";

import { Category } from "../../category/entities/category.entity";
import { Expose } from "class-transformer";
import { ProductImage } from "../../product-image/entities/product-image.entity";

@Entity('products')
export class Product {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ 
        type: 'varchar', 
        length: 100, 
        nullable: false,
        unique: true 
    })
    product_id: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sku_id: string;

    @ManyToOne(() => Category, (category) => category.products, {
        onDelete: 'RESTRICT'
    })
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'numeric', precision: 12, scale: 2 })
    price_normal: number;

    @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
    price_discount: number;

    @Column({ type: 'integer', default: 0 })
    stock: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sku_seller: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    warranty: string;

    @Column({ type: 'text', nullable: true })
    url_tiktok: string;

    @Column({ type: 'text', nullable: true })
    url_tokped: string;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    is_popular: boolean;

    @Expose()
    get final_price(): number {
        const normal = Number(this.price_normal);
        const discount = Number(this.price_discount ?? 0);
        const final = normal - discount;
        return final > 0 ? final : 0;
    }

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => ProductImage, (image) => image.product)
    images: ProductImage[];

}
