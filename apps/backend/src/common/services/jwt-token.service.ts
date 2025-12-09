import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenGenerator,
  ITokenValidator,
} from '../interfaces/token.interface';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class JwtTokenService implements ITokenGenerator, ITokenValidator {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService
  ) {}

  generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  generateRefreshToken(userId: string): string {
    const expiresIn =
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRY') || '7d';
    return this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: expiresIn as any }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validateAccessToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      this.logger.warn(`Access token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid access token');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validateRefreshToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch (error) {
      this.logger.warn(`Refresh token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
