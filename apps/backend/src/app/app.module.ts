import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NodeEnv } from '../common/enums';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { AppLoggerModule } from '../common/logger/app-logger.module';
import { LoggerErrorInterceptor } from '../common/logger/logger-error.interceptor';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

import { AuthModule } from '../modules/auth/auth.module';
import { GmailModule } from '../modules/gmail/gmail.module';
import { User } from '../modules/user/user.entity';
import { UserModule } from '../modules/user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppLoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [User],
        migrations: ['dist/migrations/*{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === NodeEnv.DEVELOPMENT,
        logging: configService.get('NODE_ENV') === NodeEnv.DEVELOPMENT,
      }),
    }),
    AuthModule,
    GmailModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
