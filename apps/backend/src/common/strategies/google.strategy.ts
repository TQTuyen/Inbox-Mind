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

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback
  ): Promise<void> {
    const { id, displayName, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      name: displayName,
      picture: photos?.[0]?.value || null,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
