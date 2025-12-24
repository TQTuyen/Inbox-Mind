import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchHistory } from '../entities/search-history.entity';
import { GmailService } from '../gmail.service';
import { EmbeddingsService } from '../../email-metadata/services/embeddings.service';
import { FuzzySearchService } from './fuzzy-search.service';
import {
  SearchSuggestionDto,
  SuggestionType,
} from '../dto/search-suggestions.dto';

@Injectable()
export class SearchSuggestionsService {
  private readonly logger = new Logger(SearchSuggestionsService.name);

  constructor(
    @InjectRepository(SearchHistory)
    private readonly searchHistoryRepository: Repository<SearchHistory>,
    private readonly gmailService: GmailService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly fuzzySearchService: FuzzySearchService
  ) {}

  /**
   * Get auto-suggestions from multiple sources
   * Priority: Search history > Recent contacts > Subject keywords > Semantic matches
   */
  async getAutoSuggestions(
    userId: string,
    query: string,
    limit = 5
  ): Promise<SearchSuggestionDto[]> {
    if (query.length < 2) {
      return [];
    }

    this.logger.log(`Getting auto-suggestions for query: "${query}"`);

    // Fetch from all sources in parallel
    const [recentContacts, subjectKeywords, semanticResults, searchHistory] =
      await Promise.all([
        this.getRecentContactSuggestions(userId, query, limit),
        this.getSubjectKeywordSuggestions(userId, query, limit),
        this.getSemanticSuggestions(userId, query, Math.min(limit, 3)), // Limit semantic to 3 max
        this.getSearchHistorySuggestions(userId, query, limit),
      ]);

    // Merge suggestions with priority order
    const suggestions = [
      ...searchHistory, // Priority 1: User's own search history
      ...recentContacts, // Priority 2: Recent contacts
      ...subjectKeywords, // Priority 3: Subject keywords
      ...semanticResults, // Priority 4: Semantic matches
    ];

    // Deduplicate by text (case-insensitive)
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = s.text.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result = unique.slice(0, limit);

    this.logger.log(
      `Returning ${result.length} suggestions (${searchHistory.length} history, ${recentContacts.length} contacts, ${subjectKeywords.length} keywords, ${semanticResults.length} semantic)`
    );

    return result;
  }

  /**
   * Get suggestions from recent email contacts
   */
  private async getRecentContactSuggestions(
    userId: string,
    query: string,
    limit: number
  ): Promise<SearchSuggestionDto[]> {
    try {
      // Fetch recent emails from INBOX
      const emails = await this.gmailService.listEmails(userId, {
        labelId: 'INBOX',
        maxResults: 100,
      });

      // Extract unique contacts
      const contacts = new Map<string, { name: string; email: string }>();

      for (const email of emails.emails) {
        const key = email.from.email.toLowerCase();
        if (!contacts.has(key)) {
          contacts.set(key, email.from);
        }
      }

      // Filter by query (match name or email)
      const queryLower = query.toLowerCase();
      const filtered = Array.from(contacts.values())
        .filter(
          (contact) =>
            contact.name.toLowerCase().includes(queryLower) ||
            contact.email.toLowerCase().includes(queryLower)
        )
        .slice(0, limit);

      return filtered.map((contact) => ({
        text: contact.name || contact.email,
        type: 'contact' as SuggestionType,
        metadata: { email: contact.email, name: contact.name },
      }));
    } catch (error) {
      this.logger.error('Failed to get contact suggestions', error);
      return [];
    }
  }

  /**
   * Get suggestions from email subject keywords
   */
  private async getSubjectKeywordSuggestions(
    userId: string,
    query: string,
    limit: number
  ): Promise<SearchSuggestionDto[]> {
    try {
      // Use fuzzy search to find matching subjects
      const fuzzyResults = await this.fuzzySearchService.fuzzySearch(userId, {
        query,
        mailboxId: 'INBOX',
        limit: 20,
      });

      // Extract keywords from subjects (words with 4+ characters)
      const keywords = new Set<string>();
      const queryLower = query.toLowerCase();

      for (const result of fuzzyResults.results) {
        const words = result.subject
          .split(/\s+/)
          .filter(
            (word) =>
              word.length >= 4 && word.toLowerCase().includes(queryLower)
          );

        words.forEach((word) => {
          // Clean up punctuation
          const cleaned = word.replace(/[^\w]/g, '');
          if (cleaned.length >= 4) {
            keywords.add(cleaned);
          }
        });
      }

      return Array.from(keywords)
        .slice(0, limit)
        .map((keyword) => ({
          text: keyword,
          type: 'keyword' as SuggestionType,
          metadata: {},
        }));
    } catch (error) {
      this.logger.error('Failed to get keyword suggestions', error);
      return [];
    }
  }

  /**
   * Get suggestions from semantic search results
   */
  private async getSemanticSuggestions(
    userId: string,
    query: string,
    limit: number
  ): Promise<SearchSuggestionDto[]> {
    try {
      // Get semantic search results with higher threshold (0.75)
      const results = await this.embeddingsService.semanticSearch(
        userId,
        query,
        limit,
        0.75 // Higher threshold for suggestions
      );

      return results.map((result) => {
        // Extract first meaningful sentence from embedded text as suggestion
        const sentences = result.embeddedText.split(/[.!?]\n/);
        const firstSentence = (sentences[0] || '')
          .replace(/\n/g, ' ')
          .substring(0, 60)
          .trim();

        return {
          text: firstSentence || query,
          type: 'semantic' as SuggestionType,
          metadata: {
            emailId: result.emailId,
            similarity: result.similarity,
          },
        };
      });
    } catch (error) {
      this.logger.error('Failed to get semantic suggestions', error);
      return [];
    }
  }

  /**
   * Get suggestions from user's search history
   */
  private async getSearchHistorySuggestions(
    userId: string,
    query: string,
    limit: number
  ): Promise<SearchSuggestionDto[]> {
    try {
      const queryLower = query.toLowerCase();

      const history = await this.searchHistoryRepository
        .createQueryBuilder('history')
        .where('history.userId = :userId', { userId })
        .andWhere('LOWER(history.query) LIKE :query', {
          query: `%${queryLower}%`,
        })
        .orderBy('history.searchedAt', 'DESC')
        .limit(limit)
        .getMany();

      return history.map((h) => ({
        text: h.query,
        type: 'history' as SuggestionType,
        metadata: { timestamp: h.searchedAt },
      }));
    } catch (error) {
      this.logger.error('Failed to get history suggestions', error);
      return [];
    }
  }

  /**
   * Save search query to history
   */
  async saveSearchHistory(userId: string, query: string): Promise<void> {
    try {
      // Check if this exact query already exists recently (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await this.searchHistoryRepository.findOne({
        where: {
          userId,
          query,
        },
        order: { searchedAt: 'DESC' },
      });

      if (existing && existing.searchedAt > oneHourAgo) {
        this.logger.log(
          `Search query "${query}" already exists in recent history, skipping`
        );
        return;
      }

      const history = this.searchHistoryRepository.create({
        userId,
        query,
        searchedAt: new Date(),
      });

      await this.searchHistoryRepository.save(history);

      this.logger.log(`Saved search history: "${query}"`);
    } catch (error) {
      this.logger.error('Failed to save search history', error);
      // Don't throw - saving history is not critical
    }
  }

  /**
   * Clear search history for a user
   */
  async clearSearchHistory(userId: string): Promise<void> {
    await this.searchHistoryRepository.delete({ userId });
    this.logger.log(`Cleared search history for user ${userId}`);
  }

  /**
   * Get search history statistics
   */
  async getSearchHistoryStats(userId: string): Promise<{
    total: number;
    uniqueQueries: number;
    recentSearches: string[];
  }> {
    const history = await this.searchHistoryRepository.find({
      where: { userId },
      order: { searchedAt: 'DESC' },
      take: 10,
    });

    const allHistory = await this.searchHistoryRepository.find({
      where: { userId },
    });

    const uniqueQueries = new Set(allHistory.map((h) => h.query)).size;

    return {
      total: allHistory.length,
      uniqueQueries,
      recentSearches: history.map((h) => h.query),
    };
  }
}
