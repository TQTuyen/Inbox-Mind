import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO for listing threads with pagination
 */
export class ListThreadsQueryDto {
  @ApiPropertyOptional({
    example: 'INBOX',
    description: 'Label ID to filter threads by',
  })
  @IsOptional()
  @IsString()
  labelId?: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Number of threads per page (1-100)',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'CABcDeFgHiJkLmN',
    description: 'Page token for pagination (from previous response)',
  })
  @IsOptional()
  @IsString()
  page?: string;
}
