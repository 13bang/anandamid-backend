import { IsUUID, IsArray, IsUrl } from 'class-validator';

export class CreateProductImageDto {

  @IsUUID()
  productId: string;

  @IsArray()
  @IsUrl({}, { each: true })
  imageUrl: string[];
}
