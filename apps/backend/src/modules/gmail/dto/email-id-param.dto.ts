import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailIdParamDto {
  @ApiProperty({ example: '18f4...', description: 'The ID of the email' })
  @IsString()
  @IsNotEmpty()
  id: string;
}
