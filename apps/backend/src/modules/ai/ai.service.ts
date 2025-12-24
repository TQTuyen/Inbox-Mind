import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });
      this.logger.log('Google Gemini AI initialized successfully');
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not found in environment variables. AI features will be disabled.'
      );
    }
  }

  async summarizeEmail(
    emailBody: string,
    emailSubject?: string
  ): Promise<string> {
    if (!this.genAI || !this.model) {
      throw new Error(
        'AI service not initialized. Please set GEMINI_API_KEY in environment variables.'
      );
    }

    try {
      const prompt = `You are an email summarization assistant. Summarize the following email in 1-2 concise sentences that capture the key points and action items. Be brief and actionable.

${emailSubject ? `Subject: ${emailSubject}\n\n` : ''}Email Content:
${emailBody}

Summary:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text().trim();

      this.logger.log(
        `Generated summary for email: ${summary.substring(0, 50)}...`
      );
      return summary;
    } catch (error) {
      this.logger.error('Error generating email summary', error);
      throw new Error('Failed to generate email summary');
    }
  }

  isAvailable(): boolean {
    return this.genAI !== null && this.model !== null;
  }

  /**
   * Generate embedding vector for a single text using Gemini text-embedding-004
   * @param text Text to embed (subject + body)
   * @returns 768-dimensional embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) {
      throw new Error(
        'AI service not initialized. Please set GEMINI_API_KEY in environment variables.'
      );
    }

    try {
      // Truncate text to 10,000 characters to stay within token limits
      const truncatedText = text.substring(0, 10000);

      // Use Gemini embedding model
      const embeddingModel = this.genAI.getGenerativeModel({
        model: 'text-embedding-004',
      });

      const result = await embeddingModel.embedContent(truncatedText);
      const embedding = result.embedding.values;

      this.logger.log(
        `Generated embedding with ${
          embedding.length
        } dimensions for text: ${truncatedText.substring(0, 50)}...`
      );

      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generate embeddings for multiple texts in batches with rate limiting
   * @param texts Array of texts to embed
   * @returns Array of 768-dimensional embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.genAI) {
      throw new Error(
        'AI service not initialized. Please set GEMINI_API_KEY in environment variables.'
      );
    }

    const results: number[][] = [];
    const batchSize = 10; // Process 10 embeddings per batch

    this.logger.log(
      `Generating embeddings for ${texts.length} texts in batches of ${batchSize}`
    );

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Generate embeddings for batch in parallel
      const batchResults = await Promise.all(
        batch.map((text) => this.generateEmbedding(text))
      );

      results.push(...batchResults);

      this.logger.log(
        `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          texts.length / batchSize
        )} (${results.length}/${texts.length} embeddings)`
      );

      // Rate limiting: 60 requests/minute for Gemini API
      // Wait 1 second between batches to stay under limit
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.log(`Successfully generated ${results.length} embeddings`);

    return results;
  }
}
