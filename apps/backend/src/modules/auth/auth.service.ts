import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EncryptionService } from '../../common/services/encryption.service';
import { JwtTokenService } from '../../common/services/jwt-token.service';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { GoogleTokenRevokerService } from './services/google-token-revoker.service';

export interface GoogleUserData {
  googleId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly encryptionService: EncryptionService,
    private readonly googleTokenRevoker: GoogleTokenRevokerService
  ) {}

  generateAppAccessToken(userId: string, email: string): string {
    return this.jwtTokenService.generateAccessToken(userId, email);
  }

  generateAppRefreshToken(userId: string): string {
    return this.jwtTokenService.generateRefreshToken(userId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validateAppAccessToken(token: string): Promise<any> {
    return this.jwtTokenService.validateAccessToken(token);
  }

  async validateAppRefreshToken(token: string): Promise<User> {
    const payload = await this.jwtTokenService.validateRefreshToken(token);

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async saveUserWithGoogleTokens(
    googleUserData: GoogleUserData
  ): Promise<User> {
    const { googleId, email, name, refreshToken } = googleUserData;

    let user = await this.userService.findByGoogleId(googleId);

    const { encrypted, iv } = this.encryptionService.encrypt(refreshToken);

    if (user) {
      user = await this.userService.update(user.id, {
        email,
        name,
        googleRefreshToken: encrypted,
        googleRefreshTokenIV: iv,
      });
    } else {
      user = await this.userService.create({
        googleId,
        email,
        name,
        googleRefreshToken: encrypted,
        googleRefreshTokenIV: iv,
      });
    }

    return user;
  }

  async revokeGoogleTokens(userId: string): Promise<void> {
    await this.googleTokenRevoker.revokeTokens(userId);
  }
}
