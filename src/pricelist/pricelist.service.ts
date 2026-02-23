import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceList } from './entities/pricelist.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PricelistService {
  constructor(
    @InjectRepository(PriceList)
    private readonly repo: Repository<PriceList>,
  ) {}

  async upload(type: string, filename: string) {
    if (!['laptop', 'komponen'].includes(type)) {
      throw new NotFoundException('Invalid pricelist type');
    }

    let existing = await this.repo.findOne({ where: { type } });

    // delete old file if exists
    if (existing?.file_path) {
      const oldPath = path.join(
        process.cwd(),
        'uploads/pricelists',
        existing.file_path,
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    if (!existing) {
      existing = this.repo.create({
        type,
        file_path: filename,
      });
    } else {
      existing.file_path = filename;
    }

    return this.repo.save(existing);
  }

  async findAll() {
    return this.repo.find();
  }

  async findByType(type: string) {
    return this.repo.findOne({ where: { type } });
  }
}