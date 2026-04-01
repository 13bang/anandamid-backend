import {
    IsNotEmpty,
    IsString,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsUUID,
    IsInt,
    Min
} from "class-validator";

import { Type } from 'class-transformer';

export class CreateProductDto {

    @IsNotEmpty()
    @IsUUID()
    category_id: string;

    @IsOptional()
    @IsString()
    product_id?: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    price_normal: number;

    @IsOptional()
     @Type(() => Number)
    @IsNumber()
    price_discount?: number;

    @IsOptional()
     @Type(() => Number)
    @IsInt()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsString()
    sku_seller?: string;

    @IsOptional()
    @IsString()
    warranty?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsBoolean()
    is_popular?: boolean;

    brand_id?: string;
}