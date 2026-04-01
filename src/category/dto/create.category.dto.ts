import { IsNotEmpty, IsString, MaxLength, IsOptional } from "class-validator";

export class CreateCategoryDto {

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @IsOptional()
  @IsString()
  image_url?: string;

}