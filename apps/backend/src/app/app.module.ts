import { resolve } from 'node:path';

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NodeEnv } from '../common/enums';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { AppLoggerModule } from '../common/logger/app-logger.module';
import { LoggerErrorInterceptor } from '../common/logger/logger-error.interceptor';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

import { AIModule } from '../modules/ai/ai.module';
import { AuthModule } from '../modules/auth/auth.module';
import { EmailMetadataModule } from '../modules/email-metadata/email-metadata.module';
import { GmailModule } from '../modules/gmail/gmail.module';
import { UserModule } from '../modules/user/user.module';

@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ssl = configService.get('DATABASE_SSL') === 'true';

        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST'),
          port: configService.get('DATABASE_PORT'),
          username: configService.get('DATABASE_USER'),
          password: configService.get('DATABASE_PASSWORD'),
          database: configService.get('DATABASE_NAME'),
          ssl,
          extra: ssl ? { ssl: { rejectUnauthorized: false } } : undefined,
          entities: [resolve(__dirname, '../**/*.entity{.ts,.js}')],
          migrations: [resolve(__dirname, '../migrations/*{.ts,.js}')],
          synchronize: configService.get('NODE_ENV') === NodeEnv.DEVELOPMENT,
          logging: configService.get('NODE_ENV') === NodeEnv.DEVELOPMENT,
        };
      },
    }),
    AuthModule,
    GmailModule,
    UserModule,
    EmailMetadataModule,
    AIModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
