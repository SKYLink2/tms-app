import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateEquipmentAssignmentDto {
  @IsEnum(['SOLO', 'TEAM'])
  mode: 'SOLO' | 'TEAM';

  @Type(() => Number)
  @IsInt()
  primaryDriverId: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  secondaryDriverId?: number;

  @IsUUID()
  truckId: string;

  @IsOptional()
  @IsUUID()
  trailerId?: string;

  @IsOptional()
  @IsUUID()
  tabletId?: string;

  @IsOptional()
  @IsUUID()
  eldDeviceId?: string;
}
