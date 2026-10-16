import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateDeviceDto {
  @IsEnum(['TABLET', 'ELD'])
  type: 'TABLET' | 'ELD';

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  imei?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
