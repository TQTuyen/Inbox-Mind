import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FuzzySearchQueryDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'marketing',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Mailbox/Label ID to search within',
    example: 'INBOX',
    default: 'INBOX',
  })
  @IsString()
  @IsOptional()
  mailboxId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

export class FuzzySearchResultDto {
  @ApiProperty({
    description: 'Email ID',
    example: '18f3a1b2c3d4e5f6',
  })
  id: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Marketing Campaign Results',
  })
  subject: string;

  @ApiProperty({
    description: 'Sender information',
    example: { name: 'John Doe', email: 'john@example.com' },
  })
  from: {
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Email snippet/preview',
    example: 'Here are the results from our latest marketing campaign...',
  })
  snippet: string;

  @ApiProperty({
    description: 'Email timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Whether email is read',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Whether email has attachments',
    example: true,
  })
  hasAttachments: boolean;

  @ApiProperty({
    description: 'Match score (0-1, higher is better)',
    example: 0.95,
  })
  score: number;

  @ApiProperty({
    description: 'Fields that matched the search query',
    example: ['subject', 'from.name'],
  })
  matchedFields: string[];
}

export class FuzzySearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [FuzzySearchResultDto],
  })
  results: FuzzySearchResultDto[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Search query used',
    example: 'marketing',
  })
  query: string;
}
