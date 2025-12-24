import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailMetadata } from './email-metadata.entity';
import { EmailEmbedding } from './email-embeddings.entity';
import { KanbanConfig } from './kanban-config.entity';
import { EmailMetadataService } from './email-metadata.service';
import { EmailMetadataController } from './email-metadata.controller';
import { EmailMetadataScheduler } from './email-metadata.scheduler';
import { EmbeddingsService } from './services/embeddings.service';
import { KanbanConfigService } from './services/kanban-config.service';
import { EmailEmbeddingsScheduler } from './email-embeddings.scheduler';
import { AIModule } from '../ai/ai.module';
import { GmailModule } from '../gmail/gmail.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailMetadata, EmailEmbedding, KanbanConfig]),
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
  exports: [EmailMetadataService, EmbeddingsService],
})
export class EmailMetadataModule {}
