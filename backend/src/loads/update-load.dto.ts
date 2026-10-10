import { PartialType } from '@nestjs/mapped-types';
import { CreateLoadDto } from './create-load.dto.js';

export class UpdateLoadDto extends PartialType(CreateLoadDto) {}