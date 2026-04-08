import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PricelistService } from './pricelist.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guards';

@Controller('pricelist')
export class PricelistController {
  constructor(private readonly service: PricelistService) {}

  @Post('upload/:type')
  @UseGuards(JwtAuthGuard)  
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/pricelists',
        filename: (req, file, callback) => {
          const unique = Date.now();
          callback(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Param('type') type: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.service.upload(type, file.filename);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':type')
  findOne(@Param('type') type: string) {
    return this.service.findByType(type);
  } 
}