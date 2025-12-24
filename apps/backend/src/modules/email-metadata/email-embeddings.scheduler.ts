import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { EmbeddingsService } from './services/embeddings.service';
import { GmailService } from '../gmail/gmail.service';

@Injectable()
export class EmailEmbeddingsScheduler {
  private readonly logger = new Logger(EmailEmbeddingsScheduler.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly gmailService: GmailService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Scheduled task: Generate embeddings for new emails
   * Runs every 30 minutes
   */
  @Cron('0 */30 * * * *') // Every 30 minutes
  async generateMissingEmbeddings() {
    this.logger.log('Starting scheduled embedding generation');

    try {
      // Get all users
      const users = await this.userRepository.find();

      this.logger.log(`Found ${users.length} users to process`);

      for (const user of users) {
        try {
          // Get recent emails from INBOX (last 50 emails)
          const emailsResponse = await this.gmailService.listEmails(user.id, {
            labelId: 'INBOX',
            maxResults: 50,
          });

          const emailIds = emailsResponse.emails.map((e) => e.id);

          if (emailIds.length === 0) {
            this.logger.log(`No emails found for user ${user.email}`);
            continue;
          }

          this.logger.log(
            `Processing ${emailIds.length} emails for user ${user.email}`
          );

          // Generate embeddings for emails that don't have them
          await this.embeddingsService.batchGenerateEmbeddings(
            user.id,
            emailIds
          );

          this.logger.log(
            `Completed embedding generation for user ${user.email}`
          );

          // Rate limiting between users (5 seconds)
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
          this.logger.error(
            `Failed to generate embeddings for user ${user.email}:`,
            error
          );
          // Continue with next user even if one fails
        }
      }

      this.logger.log('Completed scheduled embedding generation for all users');
    } catch (error) {
      this.logger.error('Failed to run scheduled embedding generation:', error);
    }
  }

  /**
   * Manual trigger for embedding generation (can be called via API)
   */
  async triggerEmbeddingGeneration(userId: string, maxEmails = 100) {
    this.logger.log(
      `Manually triggered embedding generation for user ${userId}`
    );

    try {
      // Fetch more emails for manual trigger
      const emailsResponse = await this.gmailService.listEmails(userId, {
        labelId: 'INBOX',
        maxResults: maxEmails,
      });

      const emailIds = emailsResponse.emails.map((e) => e.id);

      if (emailIds.length === 0) {
        this.logger.log(`No emails found for user ${userId}`);
        return { generated: 0, total: 0 };
      }

      const embeddings = await this.embeddingsService.batchGenerateEmbeddings(
        userId,
        emailIds
      );

      return {
        generated: embeddings.length,
        total: emailIds.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to manually generate embeddings for user ${userId}:`,
        error
      );
      throw error;
    }
  }
}
