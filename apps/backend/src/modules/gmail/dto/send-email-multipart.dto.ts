import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * DTO for sending emails with file attachments via multipart/form-data
 * This approach is more efficient than base64-in-JSON for large files
 *
 * Usage:
 * - Content-Type: multipart/form-data
 * - Files sent as 'attachments[]' field
 * - Other fields sent as form fields
 */
export class SendEmailMultipartDto {
  @ApiProperty({
    example: 'recipient@example.com',
    description:
      'Recipient email address (can be comma-separated for multiple recipients)',
  })
  @IsEmail()
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

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'File attachments (sent as multipart/form-data)',
  })
  @IsOptional()
  attachments?: Express.Multer.File[];
}

/**
 * DTO for replying to emails with file attachments via multipart/form-data
 */
export class ReplyEmailMultipartDto {
  @ApiProperty({
    example: 'recipient@example.com',
    description: 'Reply recipient email address',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    example: 'Thank you for your message',
    description: 'Reply body content (supports HTML)',
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
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'File attachments (sent as multipart/form-data)',
  })
  @IsOptional()
  attachments?: Express.Multer.File[];
}
