import { IsNotEmpty, IsUUID } from "class-validator";

export class findOneParams {

    @IsNotEmpty()
    @IsUUID()
    id: string;
}
