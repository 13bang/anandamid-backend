import { IsArray, IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

// Untuk Checkout dari Keranjang
export class CheckoutCartDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  cart_ids: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// Untuk Beli Langsung (Buy Now)
export class CheckoutDirectDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
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