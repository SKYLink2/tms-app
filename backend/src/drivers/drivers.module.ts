import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversService } from './drivers.service.js';
import { DriversController } from './drivers.controller.js';
import { Driver } from './entities/driver.entity.js';
import { EquipmentAssignment } from '../equipment/entities/equipment-assignment.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, EquipmentAssignment])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}