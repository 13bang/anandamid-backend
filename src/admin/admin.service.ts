import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Admin } from './admin.entity/admin.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(Admin)
    private repo: Repository<Admin>,
  ) {}

  async findByUsername(username: string): Promise<Admin | null> {
    return this.repo.findOne({ where: { username } });
  }

  // AUTO SEED
  async onModuleInit() {
    const username = 'admin';
    const password = '4nandam1D!';

    const existingAdmin = await this.findByUsername(username);

    if (!existingAdmin) {
      const hash = await bcrypt.hash(password, 10);

      await this.repo.save({
        username,
        password: hash,
      });

      console.log('Default admin created');
      console.log('username:', username);
      console.log('password:', password);
    } else {
      console.log('Admin already exists!');
    }
  }
}
