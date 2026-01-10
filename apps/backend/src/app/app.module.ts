import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { NodeEnv } from '../common/enums';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { AppLoggerModule } from '../common/logger/app-logger.module';
import { LoggerErrorInterceptor } from '../common/logger/logger-error.interceptor';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

import { AuthModule } from '../modules/auth/auth.module';
import { GmailModule } from '../modules/gmail/gmail.module';
import { EmailMetadataModule } from '../modules/email-metadata/email-metadata.module';
import { AIModule } from '../modules/ai/ai.module';
import { User } from '../modules/user/user.entity';
import { EmailMetadata } from '../modules/email-metadata/entities/email-metadata.entity';
import { EmailEmbedding } from '../modules/email-metadata/entities/email-embeddings.entity';
import { KanbanConfig } from '../modules/email-metadata/entities/kanban-config.entity';
import { SearchHistory } from '../modules/gmail/entities/search-history.entity';
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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          User,
          EmailMetadata,
          EmailEmbedding,
          KanbanConfig,
          SearchHistory,
        ],
        migrations: ['dist/migrations/*{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === NodeEnv.DEVELOPMENT,
        logging: configService.get('NODE_ENV') === NodeEnv.DEVELOPMENT,
      }),
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
