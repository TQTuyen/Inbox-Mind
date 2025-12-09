import { Injectable } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { GMAIL_CONFIG } from '../../../common/constants/gmail.constants';
import { GmailOperationException } from '../../../common/exceptions/gmail.exception';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { GmailClientFactoryService } from '../../../common/services/gmail-client-factory.service';
import {
  ThreadMessageDto,
  ThreadParticipantDto,
  ThreadResponseDto,
} from '../dto/thread-response.dto';
import { MimeUtils } from '../utils/mime.utils';
import { EmailThreadingService } from './email-threading.service';

/**
 * Thread Service
 * Handles retrieval and processing of Gmail conversation threads
 * Implements Gmail's threading model following RFC 5322 standards
 *
 * Responsibilities:
 * - Fetch complete threads from Gmail API
 * - Sort messages chronologically
 * - Extract participant information
 * - Build thread metadata
 */
@Injectable()
export class ThreadService {
  constructor(
    private readonly gmailClientFactory: GmailClientFactoryService,
    private readonly emailThreadingService: EmailThreadingService,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext('ThreadService');
  }

  /**
   * Retrieves a complete email thread with all messages
   * @param userId - User ID (for OAuth token lookup)
   * @param threadId - Gmail thread ID
   * @returns Complete thread with sorted messages and metadata
   */
  async getThread(
    userId: string,
    threadId: string
  ): Promise<ThreadResponseDto> {
    this.logger.info(
      {
        userId,
        threadId,
      },
      `Fetching thread ${threadId} for user ${userId}`
    );

    try {
      const gmail = await this.gmailClientFactory.createClient(userId);

      // Fetch the complete thread from Gmail API
      const thread = await this.fetchGmailThread(gmail, threadId);

      if (!thread.messages || thread.messages.length === 0) {
        this.logger.warn(
          {
            threadId,
          },
          `Thread ${threadId} has no messages`
        );
        throw new GmailOperationException(
          'fetch thread',
          new Error('Thread contains no messages')
        );
      }

      this.logger.debug(
        {
          threadId,
          messageCount: thread.messages.length,
        },
        `Retrieved thread with ${thread.messages.length} messages`
      );

      // Build the thread response
      const threadResponse = this.buildThreadResponse(thread);

      this.logger.info(
        {
          threadId,
          messageCount: threadResponse.messageCount,
          participantCount: threadResponse.participants.length,
        },
        `Successfully built thread response for ${threadId}`
      );

      return threadResponse;
    } catch (error) {
      this.logger.error(
        {
          userId,
          threadId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to fetch thread ${threadId}`
      );

      throw new GmailOperationException('fetch thread', error);
    }
  }

  /**
   * Fetches a thread from Gmail API with full message details
   * @param gmail - Gmail API client
   * @param threadId - Thread ID
   * @returns Gmail thread object
   */
  private async fetchGmailThread(
    gmail: gmail_v1.Gmail,
    threadId: string
  ): Promise<gmail_v1.Schema$Thread> {
    const response = await gmail.users.threads.get({
      userId: GMAIL_CONFIG.USER_ID,
      id: threadId,
      format: 'full', // Get full message details including headers
    });

    return response.data;
  }

  /**
   * Builds a complete thread response from Gmail thread data
   * Applies the Builder pattern for constructing complex thread objects
   * @param thread - Gmail thread object
   * @returns Formatted thread response
   */
  private buildThreadResponse(
    thread: gmail_v1.Schema$Thread
  ): ThreadResponseDto {
    const messages = thread.messages || [];

    // Sort messages chronologically (oldest first)
    const sortedMessages = this.sortMessagesChronologically(messages);

    // Convert to DTOs with extracted metadata
    const messageDtos = sortedMessages.map((msg) => this.buildMessageDto(msg));

    // Extract unique participants
    const participants = this.extractUniqueParticipants(messageDtos);

    // Get first and last message for metadata
    const firstMessage = messageDtos[0];
    const lastMessage = messageDtos[messageDtos.length - 1];

    // Check for unread messages
    const hasUnread = messageDtos.some((msg) =>
      msg.labelIds.includes('UNREAD')
    );

    // Check for attachments
    const hasAttachments = this.checkForAttachments(messages);

    return {
      threadId: thread.id || '',
      messages: messageDtos,
      messageCount: messageDtos.length,
      participants,
      subject: firstMessage.subject,
      snippet: lastMessage.snippet,
      labels: lastMessage.labelIds,
      firstMessageDate: firstMessage.internalDate,
      lastMessageDate: lastMessage.internalDate,
      hasUnread,
      hasAttachments,
    };
  }

  /**
   * Sorts messages by internal date (chronological order)
   * Uses Template Method pattern for consistent sorting
   * @param messages - Array of Gmail messages
   * @returns Sorted messages (oldest first)
   */
  private sortMessagesChronologically(
    messages: gmail_v1.Schema$Message[]
  ): gmail_v1.Schema$Message[] {
    return [...messages].sort((a, b) => {
      const dateA = parseInt(a.internalDate || '0', 10);
      const dateB = parseInt(b.internalDate || '0', 10);
      return dateA - dateB;
    });
  }

  /**
   * Builds a message DTO from Gmail message
   * Extracts essential headers and metadata
   * @param message - Gmail message
   * @returns Thread message DTO
   */
  private buildMessageDto(message: gmail_v1.Schema$Message): ThreadMessageDto {
    const headers = message.payload?.headers || [];
    const threadingInfo =
      this.emailThreadingService.extractThreadingInfo(message);

    return {
      id: message.id || '',
      threadId: message.threadId || '',
      labelIds: message.labelIds || [],
      snippet: message.snippet || '',
      internalDate: parseInt(message.internalDate || '0', 10),
      payload: message.payload || {},
      sizeEstimate: message.sizeEstimate || 0,
      from: this.extractParticipant(this.getHeaderValue(headers, 'From') || ''),
      to: this.extractMultipleParticipants(
        this.getHeaderValue(headers, 'To') || ''
      ),
      subject: this.getHeaderValue(headers, 'Subject') || '',
      date: this.getHeaderValue(headers, 'Date') || '',
      messageId: threadingInfo.messageId,
      inReplyTo: threadingInfo.inReplyTo,
      references: threadingInfo.references,
    };
  }

  /**
   * Extracts a single participant from email header
   * Handles formats: "Name" <email@example.com> or email@example.com
   * @param headerValue - Email header value
   * @returns Participant DTO
   */
  private extractParticipant(headerValue: string): ThreadParticipantDto {
    if (!headerValue) {
      return { email: '', name: undefined };
    }

    // Extract email address
    const email = this.emailThreadingService.extractEmailAddress(headerValue);

    // Extract name (text before <email>)
    const nameMatch = headerValue.match(/^"?([^"<]+)"?\s*</);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      email,
      name: name || undefined,
    };
  }

  /**
   * Extracts multiple participants from email header (To, Cc)
   * @param headerValue - Comma-separated email addresses
   * @returns Array of participant DTOs
   */
  private extractMultipleParticipants(
    headerValue: string
  ): ThreadParticipantDto[] {
    if (!headerValue) {
      return [];
    }

    // Parse email list using utility
    const emailList = MimeUtils.parseEmailList(headerValue);

    return emailList.map((email) => this.extractParticipant(email));
  }

  /**
   * Extracts all unique participants from thread messages
   * Combines From, To, and Cc recipients
   * @param messages - Array of thread message DTOs
   * @returns Array of unique participants
   */
  private extractUniqueParticipants(
    messages: ThreadMessageDto[]
  ): ThreadParticipantDto[] {
    const participantMap = new Map<string, ThreadParticipantDto>();

    messages.forEach((message) => {
      // Add sender
      if (message.from.email) {
        participantMap.set(message.from.email.toLowerCase(), message.from);
      }

      // Add recipients
      message.to.forEach((recipient) => {
        if (recipient.email) {
          participantMap.set(recipient.email.toLowerCase(), recipient);
        }
      });
    });

    return Array.from(participantMap.values());
  }

  /**
   * Checks if any message in the thread has attachments
   * @param messages - Array of Gmail messages
   * @returns True if thread contains attachments
   */
  private checkForAttachments(messages: gmail_v1.Schema$Message[]): boolean {
    return messages.some((message) => this.messageHasAttachments(message));
  }

  /**
   * Checks if a single message has attachments
   * @param message - Gmail message
   * @returns True if message has attachments
   */
  private messageHasAttachments(message: gmail_v1.Schema$Message): boolean {
    if (!message.payload) {
      return false;
    }

    return this.hasAttachmentsInPart(message.payload);
  }

  /**
   * Recursively checks for attachments in message parts
   * @param part - Message part
   * @returns True if part or subparts contain attachments
   */
  private hasAttachmentsInPart(part: gmail_v1.Schema$MessagePart): boolean {
    // Check if current part is an attachment
    if (part.filename && part.body?.attachmentId) {
      return true;
    }

    // Check subparts recursively
    if (part.parts && part.parts.length > 0) {
      return part.parts.some((subPart) => this.hasAttachmentsInPart(subPart));
    }

    return false;
  }

  /**
   * Gets header value from headers array
   * @param headers - Array of message headers
   * @param headerName - Name of header to find
   * @returns Header value or undefined
   */
  private getHeaderValue(
    headers: gmail_v1.Schema$MessagePartHeader[],
    headerName: string
  ): string | undefined {
    return MimeUtils.getHeaderValue(headers, headerName);
  }

  /**
   * Lists threads for a specific label/mailbox
   * Returns minimal thread info for listing view
   * @param userId - User ID
   * @param labelId - Label ID to filter by
   * @param maxResults - Maximum number of threads to return
   * @param pageToken - Pagination token
   * @returns Thread list response
   */
  async listThreads(
    userId: string,
    labelId?: string,
    maxResults?: number,
    pageToken?: string
  ): Promise<{
    threads: Array<{ id: string; snippet: string }>;
    nextPageToken?: string;
  }> {
    this.logger.info(
      {
        userId,
        labelId,
        maxResults,
      },
      `Listing threads for user ${userId}`
    );

    try {
      const gmail = await this.gmailClientFactory.createClient(userId);

      const response = await gmail.users.threads.list({
        userId: GMAIL_CONFIG.USER_ID,
        labelIds: labelId ? [labelId] : undefined,
        maxResults: maxResults || GMAIL_CONFIG.DEFAULT_PAGE_SIZE,
        pageToken: pageToken || undefined,
      });

      const threads = (response.data.threads || []).map((thread) => ({
        id: thread.id || '',
        snippet: thread.snippet || '',
      }));

      this.logger.debug(
        {
          threadCount: threads.length,
          hasNextPage: !!response.data.nextPageToken,
        },
        `Retrieved ${threads.length} threads`
      );

      return {
        threads,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          labelId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        `Failed to list threads`
      );

      throw new GmailOperationException('list threads', error);
    }
  }
}
