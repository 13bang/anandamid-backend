import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminLoginLog } from './admin-log.entity';
import { AdminLogService } from './admin-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminLoginLog])],
  providers: [AdminLogService],
  exports: [AdminLogService],
})
export class AdminLogModule {}
