// backend/src/compliance/dto/create-compliance.dto.ts
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';

export class CreateComplianceDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  cdlNumber: string;

  @IsString()
  @IsOptional()
  licenseIssueState?: string;

  @IsString()
  @IsOptional()
  licenseClass?: string;

  @IsString()
  @IsOptional()
  endorsements?: string;

  @IsDateString()
  cdlExpiration: string;

  @IsDateString()
  medicalCardExpiration: string;

  @IsDateString()
  @IsOptional()
  lastDrugTestDate?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}