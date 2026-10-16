import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentController } from './equipment.controller.js';
import { EquipmentService } from './equipment.service.js';
import { Equipment } from './entities/equipment.entity.js';
import { Device } from './entities/device.entity.js';
import { EquipmentAssignment } from './entities/equipment-assignment.entity.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { EquipmentAssignmentsController } from './equipment-assignments.controller.js';
import { EquipmentAssignmentService } from './equipment-assignment.service.js';
import { MaintenanceRecord } from './entities/maintenance-record.entity.js';
import { MaintenanceController } from './maintenance.controller.js';
import { MaintenanceService } from './maintenance.service.js';
import { LoadsModule } from '../loads/loads.module.js';

@Module({
  imports: [
    LoadsModule,
    TypeOrmModule.forFeature([
      Equipment,
      Device,
      EquipmentAssignment,
      MaintenanceRecord,
    ]),
  ],
  controllers: [
    EquipmentController,
    DevicesController,
    EquipmentAssignmentsController,
    MaintenanceController,
  ],
  providers: [
    EquipmentService,
    DevicesService,
    EquipmentAssignmentService,
    MaintenanceService,
  ],
})
export class EquipmentModule {}
