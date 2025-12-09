import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GMAIL_CONFIG } from '../../../common/constants/gmail.constants';

export class ListEmailsQueryDto {
  @ApiPropertyOptional({ description: 'Page token for pagination' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: GMAIL_CONFIG.MAX_PAGE_SIZE, default: GMAIL_CONFIG.DEFAULT_PAGE_SIZE, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(GMAIL_CONFIG.MAX_PAGE_SIZE)
  pageSize?: number = GMAIL_CONFIG.DEFAULT_PAGE_SIZE;
}
