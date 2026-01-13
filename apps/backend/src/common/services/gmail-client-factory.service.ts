import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { UserService } from '../../modules/user/user.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { EncryptionService } from './encryption.service';
import { GmailClientCacheService } from './gmail-client-cache.service';
import { IGmailClientFactory } from '../interfaces/gmail-client.interface';

@Injectable()
export class GmailClientFactoryService implements IGmailClientFactory {
  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly cacheService: GmailClientCacheService,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext('GmailClientFactoryService');
  }

  async createClient(userId: string): Promise<gmail_v1.Gmail> {
    const cachedClient = this.cacheService.get(userId);
    if (cachedClient) {
      return cachedClient;
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.googleRefreshToken || !user.googleRefreshTokenIV) {
      throw new UnauthorizedException(
        'No Google refresh token found. Please reconnect your Google account.'
      );
    }

    const refreshToken = this.encryptionService.decrypt(
      user.googleRefreshToken,
      user.googleRefreshTokenIV
    );

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Set up token refresh handler
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        const { encrypted, iv } = this.encryptionService.encrypt(
          tokens.refresh_token
        );
        await this.userService.update(userId, {
          googleRefreshToken: encrypted,
          googleRefreshTokenIV: iv,
        });
      }
    });

    const gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });

    this.cacheService.set(userId, gmailClient);

    return gmailClient;
  }

  /**
   * Clear invalid tokens and cache when refresh token fails
   */
  async clearInvalidTokens(userId: string): Promise<void> {
    // Remove from cache
    this.cacheService.clear(userId);

    // Clear tokens from database
    await this.userService.update(userId, {
      googleRefreshToken: null,
      googleRefreshTokenIV: null,
    });

    this.logger.warn(
      `Cleared invalid Google tokens for user ${userId}. User needs to re-authenticate.`
    );
  }

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );
  }
}
