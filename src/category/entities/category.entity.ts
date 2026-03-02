import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm";

import { Product } from "../../product/entities/product.entity";

@Entity('categories')
export class Category {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 150, unique: true })
    name: string;

    @Column({ length: 50, unique: true, nullable: true })
    code: string;

    @Column({ length: 50, unique: true, nullable: true })
    code_slug: string;

    @Column({ type: 'text', nullable: true })
    image_url: string | null;

    @Index()
    @ManyToOne(() => Category, (category) => category.children, {
        nullable: true,
        onDelete: 'SET NULL'
    })
    @JoinColumn({ name: 'parent_id' })
    parent: Category | null;

    @OneToMany(() => Category, (category) => category.parent)
    children: Category[];

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}