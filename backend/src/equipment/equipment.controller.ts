// backend/src/equipment/equipment.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EquipmentService } from './equipment.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Post()
  create(@Body() createDto: CreateEquipmentDto) {
    return this.equipmentService.create(createDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.equipmentService.updateStatus(id, status);
  }

  @Patch(':id/maintenance')
  toggleMaintenance(
    @Param('id') id: string,
    @Body('status') status: 'AVAILABLE' | 'MAINTENANCE',
  ) {
    if (status !== 'AVAILABLE' && status !== 'MAINTENANCE') {
      throw new BadRequestException(
        'Status must be AVAILABLE or MAINTENANCE.',
      );
    }
    return this.equipmentService.toggleMaintenance(id, status);
  }
}