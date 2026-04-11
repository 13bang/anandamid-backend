import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tiktok } from './entities/tiktok.entity';

@Injectable()
export class TiktokService {
  constructor(
    @InjectRepository(Tiktok)
    private readonly tiktokRepo: Repository<Tiktok>,
  ) {}

  async getLiveStatus() {
    let data = await this.tiktokRepo.findOne({ where: {} });

    // kalau belum ada row → create default
    if (!data) {
      data = await this.tiktokRepo.save({ is_live: false });
    }

    return { is_live: data.is_live };
  }

  async setLiveStatus(status: boolean) {
    let data = await this.tiktokRepo.findOne({ where: {} });

    if (!data) {
      data = this.tiktokRepo.create({ is_live: status });
    } else {
      data.is_live = status;
    }

    await this.tiktokRepo.save(data);

    return { is_live: data.is_live };
  }
}