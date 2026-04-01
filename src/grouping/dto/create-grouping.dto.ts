import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateGroupingDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsArray()
  child_ids?: string[];
}