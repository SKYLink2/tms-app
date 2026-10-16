import { IsIn } from 'class-validator';

const DRIVER_MILESTONE_STATUSES = [
  'DISPATCHED',
  'AT_PICKUP',
  'IN_TRANSIT',
  'AT_DELIVERY',
] as const;

export class UpdateDriverMilestoneDto {
  @IsIn(DRIVER_MILESTONE_STATUSES)
  status: (typeof DRIVER_MILESTONE_STATUSES)[number];
}
