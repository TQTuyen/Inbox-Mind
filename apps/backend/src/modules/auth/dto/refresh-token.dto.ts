import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ example: 'some-refresh-token-string', description: 'Refresh token to exchange for a new access token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
