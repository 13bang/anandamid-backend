import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceList } from './entities/pricelist.entity';
import { PricelistController } from './pricelist.controller';
import { PricelistService } from './pricelist.service';

@Module({
  imports: [TypeOrmModule.forFeature([PriceList])],
  controllers: [PricelistController],
  providers: [PricelistService],
})
export class PricelistModule {}