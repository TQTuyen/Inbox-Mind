import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateSummaryDto {
  @IsString()
  @IsNotEmpty()
  emailBody: string;
}
