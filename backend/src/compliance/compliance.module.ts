import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller.js';
import { ComplianceService } from './compliance.service.js';
import { DriverCompliance } from './entities/compliance.entity.js';
import { ComplianceSessionGuard } from './compliance-session.guard.js';
import { Driver } from '../drivers/entities/driver.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DriverCompliance, Driver])],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceSessionGuard],
})
export class ComplianceModule {}
