import { IsDateString } from 'class-validator';

export class SnoozeEmailDto {
  @IsDateString()
  snoozeUntil: string;
}
