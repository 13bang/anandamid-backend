import { IsOptional, IsUrl } from 'class-validator';

export class UpdateProductImageDto {

  @IsOptional()
  @IsUrl({}, { each: true })
  image_urls?: string[];
}
