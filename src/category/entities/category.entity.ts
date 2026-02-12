import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany
} from "typeorm";

import { Product } from "../../product/entities/product.entity";

@Entity('categories')
export class Category {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150 })
    name: string;

    @Column({ length: 50, unique: true })
    code: string;

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
