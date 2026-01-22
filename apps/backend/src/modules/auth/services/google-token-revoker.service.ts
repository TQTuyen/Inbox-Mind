import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { google } from 'googleapis';
import { EncryptionService } from '../../../common/services/encryption.service';
import { UserService } from '../../user/user.service';

export interface IGoogleTokenRevoker {
  revokeTokens(userId: string): Promise<void>;
}

@Injectable()
export class GoogleTokenRevokerService implements IGoogleTokenRevoker {
  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService
  ) {}

  async revokeTokens(userId: string): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        // User not found - this is okay during logout, just log and return
        console.warn(`User ${userId} not found during token revocation`);
        return;
      }

      // Check if tokens exist before trying to decrypt and revoke
      if (!user.googleRefreshToken || !user.googleRefreshTokenIV) {
        console.warn(`No Google tokens found for user ${userId}`);
        return;
      }

      const refreshToken = this.encryptionService.decrypt(
        user.googleRefreshToken,
        user.googleRefreshTokenIV
      );

      // const oauth2Client = this.createOAuth2Client();
      // oauth2Client.setCredentials({ refresh_token: refreshToken });

      // await oauth2Client.revokeCredentials();

      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: {
          token: refreshToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 5000, // 5 second timeout
      });

      console.log(`Successfully revoked Google tokens for user ${userId}`);
    } catch (error) {
      // Log the error but don't throw - logout should succeed even if token revocation fails
      // The tokens might already be revoked, expired, or there might be a network issue
      console.error('Error revoking Google tokens:', error);
      console.warn('Continuing with logout despite token revocation failure');
    }
  }

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );
  }
}
