import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateSummaryDto {
  @IsString()
  @IsNotEmpty()
  emailBody: string;

  @IsString()
  @IsOptional()
  subject?: string;
}
