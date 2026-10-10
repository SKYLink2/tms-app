import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateLoadDto {
  @IsString()
  @IsNotEmpty()
  load_number: string;

  @IsString()
  @IsNotEmpty()
  broker: string;

  @IsString()
  @IsOptional()
  customer?: string;

  @IsString()
  @IsNotEmpty()
  pickup_location: string;

  @IsString()
  @IsNotEmpty()
  delivery_location: string;

  @IsDateString()
  pickup_date: Date;

  @IsDateString()
  delivery_date: Date;

  @IsNumber()
  @Min(0, { message: 'Rate cannot be negative' })
  rate: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  miles?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @IsString()
  @IsOptional()
  commodity?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}