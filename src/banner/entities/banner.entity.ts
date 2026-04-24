import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { Brand } from '../../brand/entities/brand.entity';

@Entity('banner_image')
export class BannerImage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: true })
    title: string;

    @Column({ type: 'text' })
    image_url: string;

    @Column({ type: 'varchar', nullable: true })
    slot: string;

    @Column({ type: 'varchar', nullable: true })
    promo: string | null; 

    @ManyToMany(() => Category)
    @JoinTable({
        name: 'banner_categories', 
        joinColumn: { name: 'banner_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
    })
    categories: Category[];

    @ManyToMany(() => Brand)
    @JoinTable({
        name: 'banner_brands', 
        joinColumn: { name: 'banner_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'brand_id', referencedColumnName: 'id' },
    })
    brands: Brand[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}