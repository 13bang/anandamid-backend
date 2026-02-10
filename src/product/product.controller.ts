import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

@Controller('product')
export class ProductController {
    @Get ()
    findAll():string{
        return "Tampil Semua Product"
    }

    @Get("/:id")
    findOne(@Param() params: any): string{
        return `Tampil Detail Product ${params.id}`
    }

    @Post()
    create(): string{
        return "Tambah Product"
    }

    @Put("/:id")
    update(@Param() params: any): string{
        return `Update Product ${params.id}`
    }

    @Delete("/:id")
    delete(@Param() params: any): string{
        return `Delete Product ${params.id}`
    }
}
