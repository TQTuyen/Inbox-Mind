import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { UserService } from '../../modules/user/user.service';
import { EncryptionService } from './encryption.service';
import { GmailClientCacheService } from './gmail-client-cache.service';
import { IGmailClientFactory } from '../interfaces/gmail-client.interface';

@Injectable()
export class GmailClientFactoryService implements IGmailClientFactory {
  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly cacheService: GmailClientCacheService
  ) {}

  async createClient(userId: string): Promise<gmail_v1.Gmail> {
    const cachedClient = this.cacheService.get(userId);
    if (cachedClient) {
      return cachedClient;
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has valid Google tokens
    if (!user.googleRefreshToken || !user.googleRefreshTokenIV) {
      throw new UnauthorizedException(
        'Google authentication required. Please log in again.'
      );
    }

    const refreshToken = this.encryptionService.decrypt(
      user.googleRefreshToken,
      user.googleRefreshTokenIV
    );

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Force refresh access token immediately to ensure we have a valid token
    try {
      const { token } = await oauth2Client.getAccessToken();
      if (!token) {
        throw new Error('No access token received');
      }
      console.log('✓ Access token refreshed successfully for user:', userId);
    } catch (error) {
      console.error('Failed to refresh access token:', {
        userId,
        error: error.message,
        errorDetails: error,
      });
      throw new UnauthorizedException(
        'Failed to refresh Google access token. Please log in again.'
      );
    }

    // Set up automatic token refresh handler
    oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // If we get a new refresh token, we should update it in the database
        // This is a future enhancement
      }
    });

    const gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });

    this.cacheService.set(userId, gmailClient);

    return gmailClient;
  }

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );
  }
}
