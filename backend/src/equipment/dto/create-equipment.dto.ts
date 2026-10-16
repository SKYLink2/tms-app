// backend/src/equipment/dto/create-equipment.dto.ts
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreateEquipmentDto {
  @IsEnum(['Truck', 'Trailer'])
  type: 'Truck' | 'Trailer';

  @IsString()
  unitNumber: string;

  @IsString()
  @IsOptional()
  vin?: string;

  @IsString()
  @IsOptional()
  trailerType?: string; // Dry Van, Flatbed, etc.

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  inventory?: string[]; // e.g. ["Samsara ELD", "Straps"]

  @IsDateString()
  @IsOptional()
  nextServiceDue?: string;

  @IsNumber()
  @IsOptional()
  currentMileage?: number;
}