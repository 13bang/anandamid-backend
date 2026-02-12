import { IsOptional, IsUrl } from 'class-validator';

export class UpdateProductImageDto {

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
