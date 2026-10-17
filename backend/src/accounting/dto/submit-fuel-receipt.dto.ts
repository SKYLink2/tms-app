import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class SubmitFuelReceiptDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  gallons: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  receiptAmount: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  odometerReading: number;

  @Matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
  receiptGpsLocation: string;

  @IsDateString()
  receiptTimestamp: string;
}
