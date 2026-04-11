import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { TiktokService } from './tiktok.service';

@Controller('tiktok')
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  @Get('live-status')
  getLiveStatus() {
    return this.tiktokService.getLiveStatus();
  }

  @Post('live-toggle')
  setLiveStatus(@Body('is_live') isLive: boolean) {
    return this.tiktokService.setLiveStatus(isLive);
  }
}