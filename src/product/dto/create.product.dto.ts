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

export class CreateProductDto {

    @IsNotEmpty()
    @IsUUID()
    category_id: string;

    @IsOptional()
    @IsString()
    product_id?: string;

    @IsOptional()
    @IsString()
    sku_id?: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsNumber()
    price_normal: number;

    @IsOptional()
    @IsNumber()
    price_discount?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsString()
    sku_code?: string;

    @IsOptional()
    @IsString()
    warranty?: string;

    @IsOptional()
    @IsString()
    url_tiktok?: string;

    @IsOptional()
    @IsString()
    url_tokped?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsBoolean()
    is_popular?: boolean;
}