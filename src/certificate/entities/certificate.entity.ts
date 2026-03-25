import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("certificates")
export class Certificate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  school: string;

  @Column({ type: "date" })
  start_date: Date;

  @Column({ type: "date" })
  end_date: Date;

  @Column({ unique: true })
  certificate_number: string;

  @Column({ nullable: true })
  pdf_url: string;

  @Column({
    type: "enum",
    enum: ["lulus", "gagal", "lainnya"],
    default: "lulus",
  })
  status: string;

  @Column({ nullable: true, type: "text" })
  reason?: string;

  @CreateDateColumn()
  created_at: Date;
}