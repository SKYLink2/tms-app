import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoadsController } from './loads.controller.js';
import { LoadsService } from './loads.service.js';
import { Load } from './load.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Load])],
  controllers: [LoadsController],
  providers: [LoadsService],
})
export class LoadsModule {}