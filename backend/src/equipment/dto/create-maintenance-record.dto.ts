import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import {
  MaintenanceCategory,
  MaintenanceStatus,
} from '../entities/maintenance-record.entity.js';

export class CreateMaintenanceRecordDto {
  @IsString()
  equipmentId: string;

  @IsIn(Object.values(MaintenanceCategory))
  category: MaintenanceCategory;

  @IsString()
  @MinLength(1)
  serviceDescription: string;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  vendorLocation?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  odometerReading?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  laborCost?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  partsCost?: number;

  @IsOptional()
  @IsString()
  invoiceUrl?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsIn(Object.values(MaintenanceStatus))
  @IsOptional()
  status?: MaintenanceStatus;

  @IsDateString()
  serviceDate: string;

  @IsDateString()
  @IsOptional()
  nextScheduledDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  nextScheduledMileage?: number;
}
