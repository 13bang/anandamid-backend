import { IsUUID, IsArray, IsUrl } from 'class-validator';

export class CreateProductImageDto {

  @IsUUID()
  product_id: string;

  @IsArray()
  @IsUrl({}, { each: true })
  image_urls: string[];
}
