import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    UseInterceptors,
    UploadedFile
} from '@nestjs/common';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create.category.dto';
import { UpdateCategoryDto } from './dto/update.category.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const multerConfig = {
    storage: diskStorage({
        destination: './uploads/categories',
        filename: (req, file, cb) => {
            const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `cat-${uniqueSuffix}${extname(file.originalname)}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'image/svg+xml' ||
            file.mimetype === 'image/png' ||
            file.mimetype === 'image/jpeg'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only SVG, PNG, JPG allowed'), false);
        }
    },
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
};

@Controller('categories')
export class CategoryController {
    constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @UseInterceptors(FileInterceptor('image', multerConfig))
    create(
        @Body() dto: CreateCategoryDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const imagePath = file ? `/uploads/categories/${file.filename}` : null;
        return this.categoryService.createCategory(dto, imagePath);
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('image', multerConfig))
    update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File
    ) {
    console.log(dto);
    console.log(file);

    const imagePath = file ? `/uploads/categories/${file.filename}` : undefined;
    return this.categoryService.updateCategory(id, dto, imagePath);
    }

    @Get('parents')
    findParents() {
        return this.categoryService.findParentCategoriesWithChildren();
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