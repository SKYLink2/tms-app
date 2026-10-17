import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { LoadAuthGuard, requireLoadRole } from '../loads/load-auth.guard.js';
import { CreateFuelCardTransactionDto } from './dto/create-fuel-card-transaction.dto.js';
import { SubmitFuelReceiptDto } from './dto/submit-fuel-receipt.dto.js';
import { fuelUploadOptions } from './fuel-upload.config.js';
import { FuelTransactionsService } from './fuel-transactions.service.js';

const FUEL_MANAGEMENT_ROLES = [
  'admin',
  'owner',
  'dispatch_manager',
  'fleet_manager',
] as const;

@Controller('accounting/fuel')
@UseGuards(LoadAuthGuard)
export class FuelTransactionsController {
  constructor(private readonly fuelService: FuelTransactionsService) {}

  @Get('transactions')
  listTransactions(@Req() request: Request) {
    requireLoadRole(request, ...FUEL_MANAGEMENT_ROLES, 'safety');
    return this.fuelService.listTransactions();
  }

  @Post('card-transactions')
  createCardTransaction(
    @Req() request: Request,
    @Body() data: CreateFuelCardTransactionDto,
  ) {
    requireLoadRole(request, ...FUEL_MANAGEMENT_ROLES);
    return this.fuelService.createCardTransaction(data);
  }

  @Post('receipts')
  @UseInterceptors(FileInterceptor('receipt', fuelUploadOptions))
  submitReceipt(
    @Req() request: Request,
    @Body() data: SubmitFuelReceiptDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    requireLoadRole(request, 'driver');
    if (request.loadUser?.driverId == null) {
      throw new BadRequestException('Driver profile is not linked to this login');
    }
    return this.fuelService.submitReceipt(
      request.loadUser.driverId,
      data,
      file?.filename,
    );
  }
}
