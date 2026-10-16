import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateEquipmentAssignmentDto } from './dto/create-equipment-assignment.dto.js';
import { EquipmentAssignmentService } from './equipment-assignment.service.js';

@Controller('equipment/assignments')
export class EquipmentAssignmentsController {
  constructor(
    private readonly equipmentAssignmentService: EquipmentAssignmentService,
  ) {}

  @Get()
  findAll() {
    return this.equipmentAssignmentService.findAll();
  }

  @Get('history')
  getHistory() {
    return this.equipmentAssignmentService.getAssignmentHistory();
  }

  @Post()
  create(@Body() dto: CreateEquipmentAssignmentDto) {
    return this.equipmentAssignmentService.create(dto);
  }

  @Patch(':id/release')
  release(@Param('id') id: string) {
    return this.equipmentAssignmentService.release(id);
  }
}
