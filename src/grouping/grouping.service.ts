import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { Grouping } from './entities/grouping.entity';
import { Category } from '../category/entities/category.entity';

import { CreateGroupingDto } from './dto/create-grouping.dto';
import { UpdateGroupingDto } from './dto/update-grouping.dto';

@Injectable()
export class GroupingService {
  constructor(
    @InjectRepository(Grouping)
    private groupingRepo: Repository<Grouping>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async create(dto: CreateGroupingDto) {
    const exist = await this.groupingRepo.findOne({ where: { name: dto.name } });
    if (exist) throw new ConflictException('Grouping already exists');

    // Buat entity dengan image_url
    const grouping = this.groupingRepo.create({
      name: dto.name,
      image_url: dto.image_url, 
    });

    const savedGrouping = await this.groupingRepo.save(grouping);

    // Hubungkan child_ids jika ada
    if (dto.child_ids?.length) {
      await this.categoryRepo
        .createQueryBuilder()
        .update(Category)
        .set({ grouping: savedGrouping })
        .whereInIds(dto.child_ids)
        .execute();
    }

    return savedGrouping;
  }

async update(id: string, dto: UpdateGroupingDto) {
  const grouping = await this.groupingRepo.findOneBy({ id });
  if (!grouping) throw new NotFoundException('Grouping not found');

  // 1. Update data dasar (Nama & Image)
  if (dto.name) grouping.name = dto.name;
  if (dto.image_url) grouping.image_url = dto.image_url;
  await this.groupingRepo.save(grouping);

  // 2. Sinkronkan Kategori (Hanya kalau child_ids dikirim)
  if (dto.child_ids !== undefined) {
    // 1. Lepas semua kategori yang saat ini nempel di grouping ini
    await this.categoryRepo
      .createQueryBuilder()
      .update(Category)
      .set({ grouping: null }) // Set null buat lepasin
      .where("grouping = :id", { id }) // Pakai nama relasi 'grouping' (TypeORM bakal cari ID-nya)
      .execute();

    // 2. Assign kategori-kategori baru jika array-nya nggak kosong
    if (dto.child_ids.length > 0) {
      await this.categoryRepo
        .createQueryBuilder()
        .update(Category)
        .set({ grouping }) // Langsung pasang entity grouping-nya
        .whereInIds(dto.child_ids) // Cara paling aman buat batch update ID
        .execute();
    }
  }

  return { message: 'Grouping updated successfully', id };
}

  async findAll() {
    const data = await this.groupingRepo.find({
      relations: ['categories'],
      order: { name: 'ASC' },
    });

    data.sort((a, b) => {
      if (a.name === 'Lainnya') return 1;
      if (b.name === 'Lainnya') return -1;
      return 0; 
    });

    return data.map((g) => ({
      id: g.id,
      name: g.name,
      image_url: g.image_url,
      total_children: g.categories.length,
      children: g.categories.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
      })),
    }));
  }

  async findOne(id: string) {
    const grouping = await this.groupingRepo.findOne({
      where: { id },
      relations: ['categories'],
    });

    if (!grouping) {
      throw new NotFoundException('Grouping not found');
    }

    return grouping;
  }

  async assignCategories(groupingId: string, categoryIds: string[]) {
    const grouping = await this.groupingRepo.findOneBy({ id: groupingId });

    if (!grouping) {
      throw new NotFoundException('Grouping not found');
    }

    await this.categoryRepo
      .createQueryBuilder()
      .update(Category)
      .set({ grouping })
      .whereInIds(categoryIds)
      .execute();

    return { message: 'Categories assigned' };
  }

  // ✅ REMOVE CATEGORY
  async removeCategory(categoryId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['grouping'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.grouping = null;

    return this.categoryRepo.save(category);
  }

  // ✅ DELETE GROUPING
  async delete(id: string) {
    const grouping = await this.groupingRepo.findOne({
      where: { id },
      relations: ['categories'],
    });

    if (!grouping) {
      throw new NotFoundException('Grouping not found');
    }

    // lepas semua category
    await this.categoryRepo
      .createQueryBuilder()
      .update(Category)
      .set({ grouping: null })
      .where('grouping_id = :id', { id })
      .execute();

    await this.groupingRepo.delete(id);

    return { message: 'Grouping deleted' };
  }

    async getUngroupedCategories() {
        return this.categoryRepo.find({
            where: {
            grouping: IsNull(),
            },
            order: {
            name: 'ASC',
            },
        });
    }
}