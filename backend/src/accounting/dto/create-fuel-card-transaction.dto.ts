import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateFuelCardTransactionDto {
  @IsUUID()
  truckId: string;

  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  fuelCardAmount: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  gallons: number;

  @IsOptional()
  @IsString()
  stationName?: string;

  @IsOptional()
  @IsString()
  stationLocation?: string;

  @IsOptional()
  @Matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
  stationGpsLocation?: string;

  @IsDateString()
  cardTransactionAt: string;
}
