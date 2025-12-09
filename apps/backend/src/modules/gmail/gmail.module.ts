import { Module } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { GmailClientCacheService } from '../../common/services/gmail-client-cache.service';
import { GmailClientFactoryService } from '../../common/services/gmail-client-factory.service';
import { UserModule } from '../user/user.module';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { AttachmentService } from './services/attachment.service';
import { EmailThreadingService } from './services/email-threading.service';
import { FileUploadService } from './services/file-upload.service';
import { ThreadService } from './services/thread.service';
import { AddLabelsStrategy } from './strategies/add-labels.strategy';
import { LabelModificationStrategyFactory } from './strategies/label-modification-strategy.factory';
import { RemoveLabelsStrategy } from './strategies/remove-labels.strategy';

@Module({
  imports: [UserModule],
  controllers: [GmailController],
  providers: [
    GmailService,
    EncryptionService,
    GmailClientCacheService,
    GmailClientFactoryService,
    AppLoggerService,
    AddLabelsStrategy,
    RemoveLabelsStrategy,
    LabelModificationStrategyFactory,
    AttachmentService,
    EmailThreadingService,
    FileUploadService,
    ThreadService,
  ],
  exports: [GmailService],
})
export class GmailModule {}
