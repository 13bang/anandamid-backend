import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiktokController } from './tiktok.controller';
import { TiktokService } from './tiktok.service';
import { Tiktok } from './entities/tiktok.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tiktok])],
  controllers: [TiktokController],
  providers: [TiktokService],
})
export class TiktokModule {}