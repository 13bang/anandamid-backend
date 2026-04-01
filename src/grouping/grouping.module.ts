import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Grouping } from './entities/grouping.entity';
import { Category } from '../category/entities/category.entity';

import { GroupingService } from './grouping.service';
import { GroupingController } from './grouping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Grouping, Category])],
  providers: [GroupingService],
  controllers: [GroupingController],
})
export class GroupingModule {}