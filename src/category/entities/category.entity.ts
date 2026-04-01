import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Product } from "../../product/entities/product.entity";
import { Grouping } from "../../grouping/entities/grouping.entity";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 150, unique: true })
  name: string;

  @Column({ length: 50, unique: true, nullable: true })
  code: string;

  @Column({ length: 50, unique: true, nullable: true })
  code_slug: string;

  @Column({ type: "text", nullable: true })
  image_url: string | null;

  @ManyToOne(() => Grouping, (grouping) => grouping.categories, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "grouping_id" })
  grouping: Grouping | null;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}