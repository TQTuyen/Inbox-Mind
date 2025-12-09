import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppLoggerService } from './app-logger.service';
import { LoggerErrorInterceptor } from './logger-error.interceptor';
import { createPinoConfig } from './pino.config';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        return createPinoConfig(nodeEnv);
      },
    }),
  ],
  providers: [AppLoggerService, LoggerErrorInterceptor],
  exports: [AppLoggerService, LoggerErrorInterceptor],
})
export class AppLoggerModule {}
