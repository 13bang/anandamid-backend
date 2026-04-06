import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGroupingDto {
  @IsString()
  name!: string; // Gunakan ! di sini

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  @IsArray()
  child_ids?: string[];
}