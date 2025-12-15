import { Injectable, Logger } from '@nestjs/common';
import Fuse from 'fuse.js';
import { gmail_v1 } from 'googleapis';
import {
  FuzzySearchQueryDto,
  FuzzySearchResultDto,
  FuzzySearchResponseDto,
} from '../dto/fuzzy-search.dto';
import { GmailService } from '../gmail.service';

interface EmailSearchData {
  id: string;
  subject: string;
  from: {
    name: string;
    email: string;
  };
  snippet: string;
  timestamp: string;
  isRead: boolean;
  hasAttachments: boolean;
  body?: string; // Optional for deeper search
}

@Injectable()
export class FuzzySearchService {
  private readonly logger = new Logger(FuzzySearchService.name);

  constructor(private readonly gmailService: GmailService) {}

  /**
   * Perform fuzzy search on emails with typo tolerance and partial matching
   */
  async fuzzySearch(
    userId: string,
    searchDto: FuzzySearchQueryDto
  ): Promise<FuzzySearchResponseDto> {
    const { query, mailboxId = 'INBOX', limit = 20 } = searchDto;

    this.logger.log(
      `Fuzzy search: query="${query}", mailboxId="${mailboxId}", limit=${limit}`
    );

    // Fetch emails from Gmail API
    const emailsData = await this.fetchEmailsForSearch(userId, mailboxId);

    // Perform fuzzy search
    const searchResults = this.performFuzzySearch(emailsData, query, limit);

    return {
      results: searchResults,
      total: searchResults.length,
      query,
    };
  }

  /**
   * Fetch emails from Gmail and transform to searchable format
   */
  private async fetchEmailsForSearch(
    userId: string,
    mailboxId: string
  ): Promise<EmailSearchData[]> {
    try {
      // Fetch emails using existing Gmail service
      const response = await this.gmailService.listEmails(userId, {
        labelId: mailboxId,
        pageSize: 100, // Fetch more for better search results
      });

      const emails = response.emails || [];

      // Transform Gmail messages to searchable format
      return emails.map((email) => this.transformEmailToSearchData(email));
    } catch (error) {
      this.logger.error('Failed to fetch emails for search', error);
      return [];
    }
  }

  /**
   * Transform Gmail message to searchable data format
   */
  private transformEmailToSearchData(
    message: gmail_v1.Schema$Message
  ): EmailSearchData {
    const headers = message.payload?.headers || [];

    const getHeader = (name: string): string => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      );
      return header?.value || '';
    };

    // Parse From header
    const fromHeader = getHeader('From');
    const fromMatch = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : fromHeader;
    const fromEmail = fromMatch ? fromMatch[2].trim() : fromHeader;

    // Check if read
    const isRead = !message.labelIds?.includes('UNREAD');

    // Check for attachments
    const hasAttachments = this.hasAttachments(message);

    return {
      id: message.id || '',
      subject: getHeader('Subject') || '(No Subject)',
      from: {
        name: fromName,
        email: fromEmail,
      },
      snippet: message.snippet || '',
      timestamp: new Date(parseInt(message.internalDate || '0')).toISOString(),
      isRead,
      hasAttachments,
    };
  }

  /**
   * Check if email has attachments
   */
  private hasAttachments(message: gmail_v1.Schema$Message): boolean {
    const parts = message.payload?.parts || [];
    return parts.some(
      (part) =>
        part.filename && part.filename.length > 0 && part.body?.attachmentId
    );
  }

  /**
   * Perform fuzzy search using Fuse.js
   */
  private performFuzzySearch(
    emails: EmailSearchData[],
    query: string,
    limit: number
  ): FuzzySearchResultDto[] {
    // Configure Fuse.js for fuzzy searching
    const fuse = new Fuse(emails, {
      keys: [
        {
          name: 'subject',
          weight: 0.4, // Subject is most important
        },
        {
          name: 'from.name',
          weight: 0.3, // Sender name is second
        },
        {
          name: 'from.email',
          weight: 0.2, // Sender email is third
        },
        {
          name: 'snippet',
          weight: 0.1, // Snippet/body is least important
        },
      ],
      threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
      // Lower threshold = stricter matching
      distance: 100, // Maximum distance for typo tolerance
      minMatchCharLength: 2, // Minimum match length for partial matching
      includeScore: true, // Include match score
      includeMatches: true, // Include which fields matched
      ignoreLocation: true, // Search entire string, not just beginning
      useExtendedSearch: false,
    });

    // Perform search
    const fuseResults = fuse.search(query);

    // Transform results and apply limit
    const results = fuseResults.slice(0, limit).map((result) => {
      const email = result.item;
      const score = 1 - (result.score || 0); // Invert score (higher is better)

      // Determine which fields matched
      const matchedFields: string[] = [];
      if (result.matches) {
        for (const match of result.matches) {
          if (match.key && !matchedFields.includes(match.key)) {
            matchedFields.push(match.key);
          }
        }
      }

      return {
        id: email.id,
        subject: email.subject,
        from: email.from,
        snippet: email.snippet,
        timestamp: email.timestamp,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        score: Math.round(score * 100) / 100, // Round to 2 decimals
        matchedFields,
      };
    });

    this.logger.log(`Fuzzy search found ${results.length} results`);

    return results;
  }
}
