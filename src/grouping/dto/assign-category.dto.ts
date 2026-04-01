import { IsArray } from 'class-validator';

export class AssignCategoryDto {
  @IsArray()
  category_ids: string[];
}