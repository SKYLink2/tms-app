import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuelTransaction } from './fuel-transaction.entity.js';
import { Equipment } from '../equipment/entities/equipment.entity.js';
import { FuelService } from './fuel.service.js';
import { FuelController } from './fuel.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FuelTransaction, Equipment])],
  controllers: [FuelController],
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}