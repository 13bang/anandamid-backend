import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminLoginLog } from './admin-log.entity';

@Injectable()
export class AdminLogService {
  constructor(
    @InjectRepository(AdminLoginLog)
    private repo: Repository<AdminLoginLog>,
  ) {}

  async logLogin(
    adminId: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.repo.save({
      admin_id: adminId,
      ip_address: ip,
      user_agent: userAgent,
    });
  }
}
