import { IsArray } from 'class-validator';

export class AssignCategoryDto {
  @IsArray()
  category_ids!: string[]; // Gunakan ! di sini
}