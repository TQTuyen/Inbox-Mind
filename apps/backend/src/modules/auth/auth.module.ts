import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TOKEN_CONFIG } from '../../common/constants/token.constants';
import { EncryptionService } from '../../common/services/encryption.service';
import { JwtTokenService } from '../../common/services/jwt-token.service';
import { GoogleStrategy } from '../../common/strategies/google.strategy';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleTokenRevokerService } from './services/google-token-revoker.service';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<string>('JWT_ACCESS_TOKEN_EXPIRY') ||
          TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY;
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    EncryptionService,
    JwtTokenService,
    GoogleTokenRevokerService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
