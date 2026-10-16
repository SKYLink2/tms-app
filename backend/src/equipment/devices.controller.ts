import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { DevicesService } from './devices.service.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
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
    return this.devicesService.toggleMaintenance(id, status);
  }
}
