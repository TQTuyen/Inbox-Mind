import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for thread ID path parameter validation
 */
export class ThreadIdParamDto {
  @ApiProperty({
    example: '18d1e2f3a4b5c6d7',
    description: 'Gmail thread ID',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
