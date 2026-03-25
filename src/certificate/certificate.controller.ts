import { Controller, Post, Body, Get, Param, Query } from "@nestjs/common";
import { CertificateService } from "./certificate.service";
import { CreateCertificateDto } from "./dto/create-certificate.dto";

@Controller("certificates")
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  create(@Body() dto: CreateCertificateDto) {
    return this.certificateService.create(dto);
  }

  @Get()
  findAll() {
    return this.certificateService.findAll();
  }

  @Get("search")
  search(@Query("q") q: string) {
    return this.certificateService.search(q);
  }
  
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.certificateService.findOneById(id);
  }

}