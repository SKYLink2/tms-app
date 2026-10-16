import { IsString, MinLength } from 'class-validator';

export class ComplianceLoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(1)
  password: string;
}
