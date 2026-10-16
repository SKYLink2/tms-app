import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './accounting.controller.js';
import { AccountingService } from './accounting.service.js';
import { FuelExpense } from './entities/fuel-expense.entity.js';
import { Settlement } from './entities/settlement.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Settlement, FuelExpense])],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
