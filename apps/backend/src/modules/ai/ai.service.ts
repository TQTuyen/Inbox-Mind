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
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      this.logger.log('Google Gemini AI initialized successfully');
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not found in environment variables. AI features will be disabled.'
      );
    }
  }

  async summarizeEmail(emailBody: string, emailSubject?: string): Promise<string> {
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

      this.logger.log(`Generated summary for email: ${summary.substring(0, 50)}...`);
      return summary;
    } catch (error) {
      this.logger.error('Error generating email summary', error);
      throw new Error('Failed to generate email summary');
    }
  }

  isAvailable(): boolean {
    return this.genAI !== null && this.model !== null;
  }
}
