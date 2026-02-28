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
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @UseInterceptors(FileInterceptor('image', { // 'image' adalah nama field di form-data
        storage: diskStorage({
            destination: './uploads/categories',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `cat-${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
    }))
    create(@Body() dto: CreateCategoryDto, @UploadedFile() file: Express.Multer.File) {
        const imagePath = file ? `/uploads/categories/${file.filename}` : null;
        return this.categoryService.createCategory(dto, imagePath);
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('image', {
        storage: diskStorage({
            destination: './uploads/categories',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `cat-${uniqueSuffix}${extname(file.originalname)}`);
            },
        }),
    }))
    update(
        @Param('id') id: string,
        @Body() dto: UpdateCategoryDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        const imagePath = file ? `/uploads/categories/${file.filename}` : undefined;
        return this.categoryService.updateCategory(id, dto, imagePath);
    }

    @Get()
    findAll() {
        return this.categoryService.findAllCategory();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoryService.findOneCategory(id);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.categoryService.deleteCategory(id);
    }
}