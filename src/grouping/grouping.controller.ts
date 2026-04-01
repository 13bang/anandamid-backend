import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';

import { GroupingService } from './grouping.service';

import { CreateGroupingDto } from './dto/create-grouping.dto';
import { UpdateGroupingDto } from './dto/update-grouping.dto';
import { AssignCategoryDto } from './dto/assign-category.dto';

@Controller('groupings')
export class GroupingController {
    constructor(private readonly service: GroupingService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get('ungrouped')
    getUngrouped() {
        return this.service.getUngroupedCategories();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateGroupingDto) {
        return this.service.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateGroupingDto) {
        return this.service.update(id, dto);
    }

    @Patch(':id/assign')
    assign(
        @Param('id') id: string,
        @Body() dto: AssignCategoryDto,
    ) {
        return this.service.assignCategories(id, dto.category_ids);
    }

    @Patch('remove-category/:categoryId')
    remove(@Param('categoryId') categoryId: string) {
        return this.service.removeCategory(categoryId);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.service.delete(id);
    }
}