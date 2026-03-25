import { IsString, IsDateString, IsOptional } from "class-validator";

export class CreateCertificateDto {

  @IsString()
  name: string;

  @IsString()
  school: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsString()
  status: "lulus" | "gagal" | "lainnya";

  @IsOptional()
  @IsString()
  reason?: string;
}