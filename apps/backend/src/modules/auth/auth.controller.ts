import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../../common/constants/messages.constants';
import { COOKIE_CONFIG } from '../../common/constants/token.constants';
import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';
import { NodeEnv } from '../../common/enums';
import { GoogleAuthGuard } from '../../common/guards/google-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

interface GoogleAuthRequest extends Request {
  user: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google login' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Handle Google OAuth2 callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with access token',
  })
  async googleAuthCallback(
    @Req() req: GoogleAuthRequest,
    @Res() res: Response
  ) {
    try {
      const user = await this.authService.saveUserWithGoogleTokens(req.user);

      const appAccessToken = this.authService.generateAppAccessToken(
        user.id,
        user.email
      );
      const appRefreshToken = this.authService.generateAppRefreshToken(user.id);

      res.cookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME, appRefreshToken, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === NodeEnv.PRODUCTION,
        sameSite: COOKIE_CONFIG.SAME_SITE,
        maxAge: COOKIE_CONFIG.MAX_AGE_MS,
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${appAccessToken}`
      );
    } catch {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      res.redirect(`${frontendUrl}/auth/error`);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  @ApiResponse({ status: 400, description: 'Refresh token not provided' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Req() req: Request) {
    const refreshToken = req.cookies?.[COOKIE_CONFIG.REFRESH_TOKEN_NAME];

    if (!refreshToken) {
      throw new BadRequestException(ERROR_MESSAGES.REFRESH_TOKEN_NOT_PROVIDED);
    }

    const user = await this.authService.validateAppRefreshToken(refreshToken);
    const appAccessToken = this.authService.generateAppAccessToken(
      user.id,
      user.email
    );

    return {
      accessToken: appAccessToken,
      expiresIn: 900, // 15 minutes
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout(
    @CurrentUser() currentUser: CurrentUserData,
    @Res() res: Response
  ) {
    await this.authService.revokeGoogleTokens(currentUser.userId);

    res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN_NAME);
    res.json({ message: SUCCESS_MESSAGES.LOGGED_OUT });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  async getCurrentUser(@CurrentUser() currentUser: CurrentUserData) {
    const user = await this.userService.findById(currentUser.userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
