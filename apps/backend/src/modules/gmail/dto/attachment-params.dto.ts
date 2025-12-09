import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for attachment download parameters
 * Uses stable partId instead of dynamic attachmentId for reliable downloads
 */
export class AttachmentParamsDto {
  @ApiProperty({
    example: '18d1e2f3a4b5c6d7',
    description: 'Gmail message ID containing the attachment',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    example: '1',
    description:
      'Stable part ID of the attachment (e.g., "0", "1", "1.0"). This is consistent across requests, unlike attachmentId.',
  })
  @IsString()
  @IsNotEmpty()
  partId: string;
}
