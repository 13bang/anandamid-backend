import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateCategoryDto {

    @IsNotEmpty()
    @IsString()
    @MaxLength(150)
    name: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(50)
    code: string;

    @IsNotEmpty()
    @IsString()
    image_url?: string;     
}
