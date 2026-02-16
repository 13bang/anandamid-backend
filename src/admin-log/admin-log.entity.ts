import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('admin_login_logs')
export class AdminLoginLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  admin_id: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @CreateDateColumn()
  login_at: Date;
}
