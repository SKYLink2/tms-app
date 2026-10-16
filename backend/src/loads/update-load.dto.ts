import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateLoadDto } from './create-load.dto.js';

export class UpdateLoadDto extends PartialType(CreateLoadDto) {
  @IsString()
  @IsOptional()
  currentLocation?: string;

  @IsDateString()
  @IsOptional()
  eta?: string | null;

  @IsString()
  @IsOptional()
  trailerSealNumber?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  driverId?: number | null;

  @IsString()
  @IsOptional()
  truckUnitNumber?: string | null;
}
