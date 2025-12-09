import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MailboxIdParamDto {
  @ApiProperty({
    example: 'INBOX',
    description: 'The ID of the mailbox (label)',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
