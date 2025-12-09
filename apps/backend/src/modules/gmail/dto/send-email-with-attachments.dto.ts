import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class EmailAttachmentDto {
  @ApiProperty({
    example: 'document.pdf',
    description: 'Attachment filename',
  })
  @IsString()
  filename: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type of the attachment',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    example: 'base64EncodedData...',
    description: 'Base64 encoded attachment data',
  })
  @IsString()
  data: string;
}

export class SendEmailWithAttachmentsDto {
  @ApiProperty({
    example: 'recipient@example.com',
    description:
      'Recipient email address (can be comma-separated for multiple recipients)',
  })
  @IsString()
  to: string;

  @ApiProperty({
    example: 'Important Document',
    description: 'Email subject',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    example: 'Please find the attached documents.',
    description: 'Email body content (supports HTML)',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    example: 'cc@example.com',
    description: 'CC recipient(s) (can be comma-separated)',
  })
  @IsOptional()
  @IsString()
  cc?: string;

  @ApiPropertyOptional({
    example: 'bcc@example.com',
    description: 'BCC recipient(s) (can be comma-separated)',
  })
  @IsOptional()
  @IsString()
  bcc?: string;

  @ApiPropertyOptional({
    type: [EmailAttachmentDto],
    description: 'Array of email attachments',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @ApiPropertyOptional({
    example: '18d1e2f3a4b5c6d7',
    description: 'Thread ID to reply to (for threading support)',
  })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional({
    example: '<CABcDeFgHiJkLmN@mail.gmail.com>',
    description: 'In-Reply-To header for threading',
  })
  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @ApiPropertyOptional({
    example: '<CABcDeFgHiJkLmN@mail.gmail.com>',
    description:
      'References header for threading (space-separated message IDs)',
  })
  @IsOptional()
  @IsString()
  references?: string;
}
