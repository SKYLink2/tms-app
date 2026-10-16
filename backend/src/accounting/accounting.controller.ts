// backend/src/accounting/accounting.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AccountingService } from './accounting.service.js';
import { Settlement } from './entities/settlement.entity.js';
import { FuelExpense } from './entities/fuel-expense.entity.js';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('settlements')
  getSettlements() {
    return this.accountingService.findAllSettlements();
  }

  @Post('settlements')
  createSettlement(@Body() data: Partial<Settlement>) {
    return this.accountingService.createSettlement(data);
  }

  @Patch('settlements/:id')
  updateSettlement(@Param('id') id: string, @Body() data: Partial<Settlement>) {
    return this.accountingService.updateSettlement(id, data);
  }

  @Delete('settlements/:id')
  deleteSettlement(@Param('id') id: string) {
    return this.accountingService.deleteSettlement(id);
  }

  @Get('fuel')
  getFuel() {
    return this.accountingService.findAllFuel();
  }

  @Post('fuel')
  createFuel(@Body() data: Partial<FuelExpense>) {
    return this.accountingService.createFuelExpense(data);
  }
}