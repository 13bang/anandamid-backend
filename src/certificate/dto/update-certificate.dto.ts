import { IsString } from "class-validator";

export class UpdateCertificateDto {
  @IsString()
  name: string;
}