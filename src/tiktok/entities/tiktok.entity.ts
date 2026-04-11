import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('tiktok')
export class Tiktok {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  is_live: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}