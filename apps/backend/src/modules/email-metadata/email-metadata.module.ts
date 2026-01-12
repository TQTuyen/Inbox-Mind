import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModule } from '../ai/ai.module';
import { GmailModule } from '../gmail/gmail.module';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { EmailMetadataController } from './email-metadata.controller';
import { EmailEmbedding } from './entities/email-embeddings.entity';
import { EmailMetadata } from './entities/email-metadata.entity';
import { KanbanConfig } from './entities/kanban-config.entity';
import { EmailEmbeddingsScheduler } from './schedulers/email-embeddings.scheduler';
import { EmailMetadataScheduler } from './schedulers/email-metadata.scheduler';
import { EmailMetadataService } from './services/email-metadata.service';
import { EmbeddingsService } from './services/embeddings.service';
import { KanbanConfigService } from './services/kanban-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailMetadata,
      EmailEmbedding,
      KanbanConfig,
      User,
    ]),
    AIModule,
    forwardRef(() => GmailModule),
    UserModule,
  ],
  controllers: [EmailMetadataController],
  providers: [
    EmailMetadataService,
    EmailMetadataScheduler,
    EmbeddingsService,
    KanbanConfigService,
    EmailEmbeddingsScheduler,
  ],
  exports: [EmailMetadataService, EmbeddingsService, KanbanConfigService],
})
export class EmailMetadataModule {}
