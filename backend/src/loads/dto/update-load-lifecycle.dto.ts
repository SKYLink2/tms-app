import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { LOAD_STATUSES, type LoadStatus } from '../create-load.dto.js';

export class UpdateLoadLifecycleDto {
  @IsIn(LOAD_STATUSES)
  @IsOptional()
  status?: LoadStatus;

  @IsString()
  @IsOptional()
  currentLocation?: string;

  @IsDateString()
  @IsOptional()
  eta?: string | null;

  @IsString()
  @IsOptional()
  trailerSealNumber?: string;

  @IsString()
  @IsOptional()
  rateConfirmationUrl?: string;

  @IsString()
  @IsOptional()
  bolUrl?: string;

  @IsString()
  @IsOptional()
  podUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  receiptUrls?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  securementPhotos?: string[];
}
