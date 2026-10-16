import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLoadNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  author: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text: string;
}
