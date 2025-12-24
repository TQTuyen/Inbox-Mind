import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SemanticSearchQueryDto {
  @ApiProperty({
    description: 'Search query text',
    example: 'project deadline',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Similarity threshold (0-1)',
    default: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  threshold?: number;
}

export class SemanticSearchResultDto {
  @ApiProperty({ description: 'Email ID' })
  emailId: string;

  @ApiProperty({ description: 'Semantic similarity score (0-1)' })
  similarity: number;

  @ApiProperty({ description: 'Email subject' })
  subject: string;

  @ApiProperty({ description: 'Email preview/snippet' })
  preview: string;

  @ApiProperty({ description: 'Sender information' })
  from: { name: string; email: string };

  @ApiProperty({ description: 'Email timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Read status' })
  isRead: boolean;
}

export class SemanticSearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [SemanticSearchResultDto],
  })
  results: SemanticSearchResultDto[];

  @ApiProperty({ description: 'Total results found' })
  total: number;

  @ApiProperty({ description: 'Original search query' })
  query: string;
}

export class GenerateEmbeddingsDto {
  @ApiProperty({
    description: 'Email IDs to generate embeddings for',
    type: [String],
    example: ['email-id-1', 'email-id-2'],
  })
  @IsArray()
  @IsString({ each: true })
  emailIds: string[];
}
