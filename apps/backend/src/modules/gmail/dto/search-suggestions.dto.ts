import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SuggestionType = 'contact' | 'keyword' | 'semantic' | 'history';

export class SearchSuggestionDto {
  @ApiProperty({
    description: 'Suggestion text',
    example: 'john@example.com',
  })
  text: string;

  @ApiProperty({
    description: 'Type of suggestion',
    enum: ['contact', 'keyword', 'semantic', 'history'],
    example: 'contact',
  })
  type: SuggestionType;

  @ApiProperty({
    description: 'Additional metadata for the suggestion',
    example: { email: 'john@example.com' },
  })
  metadata: Record<string, any>;
}

export class AutoSuggestionsQueryDto {
  @ApiProperty({
    description: 'Partial search query (at least 2 characters)',
    example: 'john',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to return',
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(10)
  limit?: number;
}

export class AutoSuggestionsResponseDto {
  @ApiProperty({
    description: 'List of suggestions',
    type: [SearchSuggestionDto],
  })
  suggestions: SearchSuggestionDto[];

  @ApiProperty({
    description: 'Original query text',
    example: 'john',
  })
  query: string;
}

export class SaveSearchHistoryDto {
  @ApiProperty({
    description: 'Search query to save',
    example: 'project deadline',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;
}
