import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import {
  GOOGLE_PROFILE_URL,
  GOOGLE_SCOPES,
} from '../constants/gmail.constants';

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: { value: string; verified: boolean }[];
  photos: { value: string }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: [...GOOGLE_SCOPES],
      userProfileURL: GOOGLE_PROFILE_URL,
    });
  }

  // Override authorizationParams to add access_type=offline and prompt=consent
  // This forces Google to always show consent screen and return refresh token
  authorizationParams(): { [key: string]: string } {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback
  ): Promise<void> {
    const { id, displayName, emails } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      name: displayName,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
