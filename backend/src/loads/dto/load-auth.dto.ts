import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { LOAD_USER_ROLES, type LoadUserRole } from '../load-user.entity.js';

export class LoadLoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class ChangeLoadPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(16)
  newPassword: string;
}

export class CreateLoadUserDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(16)
  password: string;

  @IsIn(LOAD_USER_ROLES)
  role: LoadUserRole;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  driverId?: number;
}

export class UpdateDriverAccountDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  driverId?: number | null;
}

export class UpdateLoadUserRoleDto {
  @IsIn(LOAD_USER_ROLES)
  role: LoadUserRole;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  driverId?: number;
}
