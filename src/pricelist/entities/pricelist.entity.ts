import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('price_lists')
export class PriceList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  type: string; 

  @Column()
  file_path: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}