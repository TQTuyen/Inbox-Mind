import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  Length,
  Matches,
} from 'class-validator';

export class CreateKanbanColumnDto {
  @ApiProperty({
    description: 'Display title for the column',
    example: 'In Review',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title: string;

  @ApiPropertyOptional({
    description: 'Custom column ID (auto-generated if not provided)',
    example: 'CUSTOM_REVIEW',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  columnId?: string;

  @ApiPropertyOptional({
    description:
      'Existing Gmail label ID to associate (new label created if not provided)',
    example: 'Label_123',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  gmailLabelId?: string;

  @ApiPropertyOptional({
    description: 'Optional hex color for the column',
    example: '#3b82f6',
    pattern: '^#[0-9a-fA-F]{6}$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #3b82f6)',
  })
  color?: string;
}

export class UpdateKanbanColumnDto {
  @ApiPropertyOptional({
    description: 'New display title for the column',
    example: 'Under Review',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  title?: string;

  @ApiPropertyOptional({
    description:
      'Whether to update the Gmail label name to match the new title',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  updateGmailLabel?: boolean;

  @ApiPropertyOptional({
    description: 'Optional hex color for the column',
    example: '#10b981',
    pattern: '^#[0-9a-fA-F]{6}$',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #10b981)',
  })
  color?: string;
}

export class ReorderKanbanColumnsDto {
  @ApiProperty({
    description: 'Array of column IDs in desired order',
    example: ['INBOX', 'TODO', 'CUSTOM_REVIEW', 'IN_PROGRESS', 'DONE'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  columnIds: string[];
}

export class KanbanColumnDto {
  @ApiProperty({ description: 'Column ID', example: 'TODO' })
  columnId: string;

  @ApiProperty({ description: 'Display title', example: 'To Do' })
  title: string;

  @ApiProperty({ description: 'Associated Gmail label ID', example: 'Label_1' })
  gmailLabelId: string;

  @ApiProperty({ description: 'Column position/order', example: 1 })
  position: number;

  @ApiPropertyOptional({
    description: 'Optional hex color',
    example: '#3b82f6',
  })
  color?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class KanbanConfigResponseDto {
  @ApiProperty({
    description: 'List of Kanban columns',
    type: [KanbanColumnDto],
  })
  columns: KanbanColumnDto[];
}
