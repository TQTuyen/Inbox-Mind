import { IsString, IsEmail, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({
    example: 'recipient@example.com',
    description: 'Recipient email address',
  })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Meeting Reminder', description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({
    example: "Don't forget the meeting at 2 PM",
    description: 'Email body content',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    example: 'cc@example.com',
    description: 'CC recipient',
  })
  @IsOptional()
  @ValidateIf((o) => o.cc !== '')
  @IsEmail()
  cc?: string;

  @ApiPropertyOptional({
    example: 'bcc@example.com',
    description: 'BCC recipient',
  })
  @IsOptional()
  @ValidateIf((o) => o.bcc !== '')
  @IsEmail()
  bcc?: string;
}
