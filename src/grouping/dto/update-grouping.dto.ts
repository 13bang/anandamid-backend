import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateGroupingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsArray()
  child_ids?: string[];
}