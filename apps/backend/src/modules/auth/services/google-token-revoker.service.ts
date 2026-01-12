import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { EncryptionService } from '../../../common/services/encryption.service';
import { UserService } from '../../user/user.service';

export interface IGoogleTokenRevoker {
  revokeTokens(userId: string): Promise<void>;
}

@Injectable()
export class GoogleTokenRevokerService implements IGoogleTokenRevoker {
  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService
  ) {}

  async revokeTokens(userId: string): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user has tokens to revoke
      if (!user.googleRefreshToken || !user.googleRefreshTokenIV) {
        // Already logged out or tokens already cleared
        return;
      }

      const refreshToken = this.encryptionService.decrypt(
        user.googleRefreshToken,
        user.googleRefreshTokenIV
      );

      // Revoke tokens at Google
      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: {
          token: refreshToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 5000, // 5 second timeout
      });

      // Clear tokens from database to prevent using revoked tokens
      await this.userService.update(userId, {
        googleRefreshToken: null,
        googleRefreshTokenIV: null,
      });
    } catch (error) {
      console.error('Error revoking Google tokens:', error);
      throw new InternalServerErrorException('Failed to revoke Google tokens');
    }
  }
}
