import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete
} from '@nestjs/common';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create.category.dto';
import { UpdateCategoryDto } from './dto/update.category.dto';

@Controller('categories')
export class CategoryController {

    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    create(@Body() dto: CreateCategoryDto) {
        return this.categoryService.createCategory(dto);
    }

    @Get()
    findAll() {
        return this.categoryService.findAllCategory();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoryService.findOneCategory(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateCategoryDto
    ) {
        return this.categoryService.updateCategory(id, dto);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.categoryService.deleteCategory(id);
    }
}
