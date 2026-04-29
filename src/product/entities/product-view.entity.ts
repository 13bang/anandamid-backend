import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_views')
@Unique(['product', 'view_date']) // Kunci agar Upsert jalan
export class ProductView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'date' })
  view_date: string; // Simpan format 'YYYY-MM-DD'

  @Column({ type: 'int', default: 0 })
  count: number;
}