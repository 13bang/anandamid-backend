import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  OneToMany, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relasi ke tabel users
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: string; // Otomatis terisi karena JoinColumn

  @Column({ unique: true })
  invoice_number: string;

  @Column('decimal', { precision: 12, scale: 2 })
  total_price: number;

  @Column({ default: 'PENDING' })
  status: string; // PENDING, LUNAS, BATAL

  @Column({ type: 'text', nullable: true })
  notes: string; // Opsional: Catatan dari pembeli

  // Relasi ke order_items
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}