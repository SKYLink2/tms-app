import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './accounting.controller.js';
import { AccountingService } from './accounting.service.js';
import { FuelExpense } from './entities/fuel-expense.entity.js';
import { Settlement } from './entities/settlement.entity.js';
import { FuelTransaction } from './entities/fuel-transaction.entity.js';
import { EquipmentAssignment } from '../equipment/entities/equipment-assignment.entity.js';
import { Equipment } from '../equipment/entities/equipment.entity.js';
import { LoadsModule } from '../loads/loads.module.js';
import { FuelTransactionsController } from './fuel-transactions.controller.js';
import { FuelTransactionsService } from './fuel-transactions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Settlement,
      FuelExpense,
      FuelTransaction,
      EquipmentAssignment,
      Equipment,
    ]),
    LoadsModule,
  ],
  controllers: [AccountingController, FuelTransactionsController],
  providers: [AccountingService, FuelTransactionsService],
})
export class AccountingModule {}
