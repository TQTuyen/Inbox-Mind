import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class ReplyEmailDto {
  @ApiPropertyOptional({
    example: 'recipient@example.com',
    description:
      'Reply recipient email address (optional - auto-extracted from original email if not provided)',
  })
  @IsOptional()
  @ValidateIf((o) => o.to !== '')
  @IsEmail()
  to?: string;

  @ApiProperty({
    example: 'Thank you for your message',
    description: 'Reply body content',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    example: 'cc@example.com',
    description: 'CC recipient(s)',
  })
  @IsOptional()
  @IsString()
  cc?: string;

  @ApiPropertyOptional({
    example: 'bcc@example.com',
    description: 'BCC recipient(s)',
  })
  @IsOptional()
  @IsString()
  bcc?: string;

  @ApiPropertyOptional({
    example: ['attachment1.pdf', 'attachment2.jpg'],
    description: 'Array of attachment file names to include in reply',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
