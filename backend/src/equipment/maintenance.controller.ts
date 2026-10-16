import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoadAuthGuard, requireLoadRole } from '../loads/load-auth.guard.js';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto.js';
import { MaintenanceService } from './maintenance.service.js';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('records')
  @UseGuards(LoadAuthGuard)
  findAll(@Req() request: Request) {
    requireLoadRole(request, 'admin', 'owner', 'dispatch_manager', 'fleet_manager');
    return this.maintenanceService.findAll();
  }

  @Get('summary')
  @UseGuards(LoadAuthGuard)
  getExpenseSummary(@Req() request: Request) {
    requireLoadRole(request, 'admin', 'owner', 'dispatch_manager', 'fleet_manager');
    return this.maintenanceService.getMaintenanceExpenseSummary();
  }

  @Get('equipment/:equipmentId')
  @UseGuards(LoadAuthGuard)
  getEquipmentHistory(
    @Param('equipmentId') equipmentId: string,
    @Req() request: Request,
  ) {
    requireLoadRole(request, 'admin', 'owner', 'dispatch_manager', 'fleet_manager');
    return this.maintenanceService.getEquipmentHistory(equipmentId);
  }

  @Post('records')
  @UseGuards(LoadAuthGuard)
  createRecord(
    @Body() dto: CreateMaintenanceRecordDto,
    @Req() request: Request,
  ) {
    requireLoadRole(request, 'admin', 'owner', 'fleet_manager');
    return this.maintenanceService.createRecord(
      dto,
      request.loadUser?.id,
    );
  }
}
