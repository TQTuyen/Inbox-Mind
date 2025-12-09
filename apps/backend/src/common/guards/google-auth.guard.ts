import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GOOGLE_OAUTH_CONFIG } from '../constants/gmail.constants';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions() {
    return {
      accessType: GOOGLE_OAUTH_CONFIG.ACCESS_TYPE,
      prompt: GOOGLE_OAUTH_CONFIG.PROMPT,
    };
  }
}
