import {
    IsOptional,
    IsString,
    IsNumber,
    IsBoolean,
    IsUUID,
    IsInt,
    Min
} from "class-validator";

export class UpdateProductDto {

    @IsOptional()
    @IsUUID()
    category_id?: string;

    @IsOptional()
    @IsString()
    sku_seller?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    price_normal?: number;

    @IsOptional()
    @IsNumber()
    price_discount?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsString()
    warranty?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @IsOptional()
    @IsBoolean()
    is_popular?: boolean;
}
