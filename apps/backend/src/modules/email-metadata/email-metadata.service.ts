import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { EmailMetadata, KanbanStatus } from './email-metadata.entity';

@Injectable()
export class EmailMetadataService {
  private readonly logger = new Logger(EmailMetadataService.name);

  constructor(
    @InjectRepository(EmailMetadata)
    private readonly emailMetadataRepository: Repository<EmailMetadata>
  ) {}

  async upsertMetadata(
    userId: string,
    emailId: string,
    data: {
      kanbanStatus?: KanbanStatus;
      snoozeUntil?: Date | null;
      summary?: string | null;
    }
  ): Promise<EmailMetadata> {
    let metadata = await this.emailMetadataRepository.findOne({
      where: { userId, emailId },
    });

    if (metadata) {
      // Update existing
      Object.assign(metadata, data);
    } else {
      // Create new
      metadata = this.emailMetadataRepository.create({
        userId,
        emailId,
        ...data,
      });
    }

    return this.emailMetadataRepository.save(metadata);
  }

  async getMetadata(
    userId: string,
    emailId: string
  ): Promise<EmailMetadata | null> {
    return this.emailMetadataRepository.findOne({
      where: { userId, emailId },
    });
  }

  async getMetadataForEmails(
    userId: string,
    emailIds: string[]
  ): Promise<EmailMetadata[]> {
    if (emailIds.length === 0) return [];

    return this.emailMetadataRepository
      .createQueryBuilder('metadata')
      .where('metadata.userId = :userId', { userId })
      .andWhere('metadata.emailId IN (:...emailIds)', { emailIds })
      .getMany();
  }

  async updateKanbanStatus(
    userId: string,
    emailId: string,
    kanbanStatus: KanbanStatus
  ): Promise<EmailMetadata> {
    return this.upsertMetadata(userId, emailId, { kanbanStatus });
  }

  async snoozeEmail(
    userId: string,
    emailId: string,
    snoozeUntil: Date
  ): Promise<EmailMetadata> {
    return this.upsertMetadata(userId, emailId, {
      kanbanStatus: 'snoozed',
      snoozeUntil,
    });
  }

  async unsnoozeEmail(userId: string, emailId: string): Promise<EmailMetadata> {
    return this.upsertMetadata(userId, emailId, {
      kanbanStatus: 'inbox',
      snoozeUntil: null,
    });
  }

  async updateSummary(
    userId: string,
    emailId: string,
    summary: string
  ): Promise<EmailMetadata> {
    return this.upsertMetadata(userId, emailId, { summary });
  }

  async getExpiredSnoozes(): Promise<EmailMetadata[]> {
    const now = new Date();
    return this.emailMetadataRepository.find({
      where: {
        kanbanStatus: 'snoozed',
        snoozeUntil: LessThanOrEqual(now),
      },
    });
  }

  async restoreFromSnooze(metadataId: string): Promise<void> {
    await this.emailMetadataRepository.update(metadataId, {
      kanbanStatus: 'inbox',
      snoozeUntil: null,
    });
  }
}
