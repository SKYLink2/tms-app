import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  Matches,
  IsString,
  Min,
} from 'class-validator';

export const LOAD_STATUSES = [
  'DRAFT',
  'QUOTED',
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'DISPATCHED',
  'AT_PICKUP',
  'LOADED',
  'IN_TRANSIT',
  'AT_DELIVERY',
  'DELIVERED',
  'INVOICED',
  'COMPLETED',
] as const;

export type LoadStatus = (typeof LOAD_STATUSES)[number];

export class CreateLoadDto {
  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsOptional()
  broker?: string;

  @IsNumber()
  @Min(0, { message: 'Rate cannot be negative' })
  rate: number;

  @IsDateString()
  @IsOptional()
  pickupDate?: string | null;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Pickup time must use 24-hour HH:mm format',
  })
  @IsOptional()
  pickupTime?: string | null;

  @IsDateString()
  @IsOptional()
  deliveryDate?: string | null;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Delivery time must use 24-hour HH:mm format',
  })
  @IsOptional()
  deliveryTime?: string | null;

  @IsIn(LOAD_STATUSES)
  @IsOptional()
  status?: LoadStatus;

  @IsInt()
  @IsOptional()
  @Min(1)
  driverId?: number | null;

  @IsString()
  @IsOptional()
  truckUnitNumber?: string | null;
}
