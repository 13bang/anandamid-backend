import { 
  IsArray, IsNotEmpty, IsString, IsOptional, 
  IsNumber, Min, ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

// ================= CHECKOUT CART =================
export class CheckoutCartDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  cart_ids: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// ================= CHECKOUT DIRECT =================
export class CheckoutDirectDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
  @Type(() => Number) // 🔥 penting
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  variasi?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ================= BUILDER ITEM =================
class BuilderItemDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @Type(() => Number) // 🔥 penting
  @IsNumber()
  @Min(1)
  quantity: number;
}

// ================= CHECKOUT BUILDER =================
export class CheckoutBuilderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuilderItemDto)
  items: BuilderItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}