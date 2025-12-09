import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    example: true,
    description: 'Whether the email should be marked as read',
  })
  @IsBoolean()
  read: boolean;
}
