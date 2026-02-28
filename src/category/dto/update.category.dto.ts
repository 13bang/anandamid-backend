import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateCategoryDto {

    @IsOptional()
    @IsString()
    @MaxLength(150)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    code?: string;

    @IsOptional()
    @IsString()
    image_url?: string; 
}
