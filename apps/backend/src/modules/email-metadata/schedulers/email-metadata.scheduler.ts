import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailMetadataService } from '../services/email-metadata.service';

@Injectable()
export class EmailMetadataScheduler {
  private readonly logger = new Logger(EmailMetadataScheduler.name);

  constructor(private readonly emailMetadataService: EmailMetadataService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredSnoozes() {
    try {
      const expiredSnoozes =
        await this.emailMetadataService.getExpiredSnoozes();

      if (expiredSnoozes.length > 0) {
        this.logger.log(
          `Found ${expiredSnoozes.length} expired snoozes to restore`
        );

        for (const metadata of expiredSnoozes) {
          await this.emailMetadataService.restoreFromSnooze(metadata.id);
          this.logger.log(
            `Restored email ${metadata.emailId} from snooze for user ${metadata.userId}`
          );
        }
      }
    } catch (error) {
      this.logger.error('Error processing expired snoozes', error);
    }
  }
}
