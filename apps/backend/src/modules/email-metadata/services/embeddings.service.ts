import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailEmbedding } from '../entities/email-embeddings.entity';
import { AIService } from '../../ai/ai.service';
import { GmailService } from '../../gmail/gmail.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    @InjectRepository(EmailEmbedding)
    private readonly embeddingsRepository: Repository<EmailEmbedding>,
    private readonly aiService: AIService,
    private readonly gmailService: GmailService
  ) {}

  /**
   * Generate and store embedding for a single email
   */
  async generateEmbeddingForEmail(
    userId: string,
    emailId: string,
    forceRegenerate = false
  ): Promise<EmailEmbedding> {
    // Check if embedding already exists
    if (!forceRegenerate) {
      const existing = await this.embeddingsRepository.findOne({
        where: { userId, emailId },
      });

      if (existing) {
        this.logger.log(
          `Embedding already exists for email ${emailId}, skipping generation`
        );
        return existing;
      }
    }

    this.logger.log(`Generating embedding for email ${emailId}`);

    // Fetch email from Gmail
    const email = await this.gmailService.getEmail(userId, emailId);

    // Extract subject from headers
    const subjectHeader = email.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === 'subject'
    );
    const subject = subjectHeader?.value || '';

    // Extract body from payload (simplified - gets text/plain or text/html)
    let body = '';
    if (email.payload?.body?.data) {
      // Body is in the main payload
      body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
    } else if (email.payload?.parts) {
      // Body is in parts - find text/plain or text/html
      const textPart = email.payload.parts.find(
        (part) =>
          part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    // Prioritize subject and first 5000 chars of body
    const embeddedText = `${subject}\n\n${body.substring(0, 5000)}`;

    // Skip if text is too short
    if (embeddedText.length < 10) {
      this.logger.warn(
        `Email ${emailId} has insufficient text for embedding (${embeddedText.length} chars), skipping`
      );
      throw new Error('Email text too short for embedding');
    }

    // Generate embedding using Gemini
    const embedding = await this.aiService.generateEmbedding(embeddedText);

    // Upsert to database
    const embeddingEntity = this.embeddingsRepository.create({
      userId,
      emailId,
      embedding,
      embeddedText,
    });

    const saved = await this.embeddingsRepository.save(embeddingEntity);

    this.logger.log(
      `Successfully generated and saved embedding for email ${emailId}`
    );

    return saved;
  }

  /**
   * Batch generate embeddings for multiple emails
   */
  async batchGenerateEmbeddings(
    userId: string,
    emailIds: string[]
  ): Promise<EmailEmbedding[]> {
    this.logger.log(
      `Batch generating embeddings for ${emailIds.length} emails`
    );

    // Filter out emails that already have embeddings
    const existingEmbeddings = await this.embeddingsRepository
      .createQueryBuilder('embedding')
      .where('embedding.userId = :userId', { userId })
      .andWhere('embedding.emailId IN (:...emailIds)', { emailIds })
      .getMany();

    const existingEmailIds = new Set(existingEmbeddings.map((e) => e.emailId));
    const emailsToProcess = emailIds.filter((id) => !existingEmailIds.has(id));

    if (emailsToProcess.length === 0) {
      this.logger.log(
        `All ${emailIds.length} emails already have embeddings, skipping generation`
      );
      return existingEmbeddings;
    }

    this.logger.log(
      `Found ${existingEmbeddings.length} existing embeddings, generating ${emailsToProcess.length} new embeddings`
    );

    // Fetch emails in batch
    const emails = await Promise.all(
      emailsToProcess.map((emailId) =>
        this.gmailService.getEmail(userId, emailId).catch((error) => {
          this.logger.error(
            `Failed to fetch email ${emailId}: ${error.message}`
          );
          return null;
        })
      )
    );

    // Filter out failed fetches and prepare texts
    const validEmails = emails.filter((email) => email !== null);
    const texts = validEmails.map((email) => {
      // Extract subject from headers
      const subjectHeader = email.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === 'subject'
      );
      const subject = subjectHeader?.value || '';

      // Extract body from payload
      let body = '';
      if (email.payload?.body?.data) {
        body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
      } else if (email.payload?.parts) {
        const textPart = email.payload.parts.find(
          (part) =>
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      return `${subject}\n\n${body.substring(0, 5000)}`;
    });

    if (texts.length === 0) {
      this.logger.warn('No valid emails to generate embeddings for');
      return existingEmbeddings;
    }

    // Generate embeddings in batch
    const embeddings = await this.aiService.generateEmbeddings(texts);

    // Save to database in batch
    const embeddingEntities = validEmails.map((email, index) =>
      this.embeddingsRepository.create({
        userId,
        emailId: email.id,
        embedding: embeddings[index],
        embeddedText: texts[index],
      })
    );

    const newEmbeddings = await this.embeddingsRepository.save(
      embeddingEntities
    );

    this.logger.log(
      `Successfully generated and saved ${newEmbeddings.length} new embeddings`
    );

    return [...existingEmbeddings, ...newEmbeddings];
  }

  /**
   * Semantic search using vector similarity
   * Uses pgvector's cosine distance operator (<=>)
   *
   * TODO: This requires pgvector extension. Currently using jsonb for embeddings.
   * Install pgvector to enable efficient vector similarity search.
   */
  async semanticSearch(
    userId: string,
    queryText: string,
    limit = 10,
    threshold = 0.7 // Minimum similarity score (0-1)
  ): Promise<
    Array<{ emailId: string; similarity: number; embeddedText: string }>
  > {
    this.logger.log(
      `Performing semantic search for user ${userId}: "${queryText}"`
    );

    // Generate embedding for query
    const queryEmbedding = await this.aiService.generateEmbedding(queryText);

    try {
      // Convert embedding array to PostgreSQL vector format
      const vectorString = `[${queryEmbedding.join(',')}]`;

      // Perform vector similarity search using pgvector
      // Cosine similarity = 1 - cosine_distance
      // <=> is the cosine distance operator in pgvector
      // CAST parameter to vector type for pgvector operator compatibility
      const results = await this.embeddingsRepository
        .createQueryBuilder('embedding')
        .select('embedding.emailId', 'emailId')
        .addSelect('embedding.embeddedText', 'embeddedText')
        .addSelect(
          `1 - (embedding.embedding <=> CAST(:vectorString AS vector))`,
          'similarity'
        )
        .where('embedding.userId = :userId', { userId })
        .andWhere(
          `1 - (embedding.embedding <=> CAST(:vectorString AS vector)) > :threshold`,
          { threshold }
        )
        .setParameter('vectorString', vectorString)
        .orderBy('similarity', 'DESC')
        .limit(limit)
        .getRawMany();

      this.logger.log(
        `Found ${results.length} results with similarity > ${threshold}`
      );

      return results.map((row) => ({
        emailId: row.emailId,
        similarity: parseFloat(row.similarity),
        embeddedText: row.embeddedText,
      }));
    } catch (error) {
      // If pgvector is not installed, fall back to basic text search
      this.logger.warn(
        'pgvector not available, semantic search is disabled. Install pgvector extension for vector similarity search.'
      );
      this.logger.warn(`Error: ${error.message}`);

      // Return empty results for now
      // TODO: Implement fallback text search using pg_trgm or full-text search
      return [];
    }
  }

  /**
   * Delete embedding for an email (e.g., when email is deleted)
   */
  async deleteEmbedding(userId: string, emailId: string): Promise<void> {
    await this.embeddingsRepository.delete({ userId, emailId });
    this.logger.log(`Deleted embedding for email ${emailId}`);
  }

  /**
   * Get embedding statistics for a user
   */
  async getEmbeddingStats(userId: string): Promise<{
    total: number;
    totalSize: number;
  }> {
    const result = await this.embeddingsRepository
      .createQueryBuilder('embedding')
      .select('COUNT(*)', 'total')
      .where('embedding.userId = :userId', { userId })
      .getRawOne();

    return {
      total: parseInt(result.total) || 0,
      totalSize: (parseInt(result.total) || 0) * 768 * 4, // 768 dimensions * 4 bytes per float
    };
  }
}
