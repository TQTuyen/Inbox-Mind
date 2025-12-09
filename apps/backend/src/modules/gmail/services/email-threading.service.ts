import { Injectable } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { MimeUtils } from '../utils/mime.utils';

/**
 * Threading information extracted from email
 */
export interface ThreadingInfo {
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  subject: string;
  threadId?: string;
  from?: string;
  to?: string;
}

/**
 * Reply threading headers
 */
export interface ReplyThreadingHeaders {
  'In-Reply-To'?: string;
  References?: string;
  Subject: string;
}

/**
 * Email Threading Service
 * Extracts and manages email threading information
 * Implements RFC 5322 threading standards
 */
@Injectable()
export class EmailThreadingService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('EmailThreadingService');
  }

  /**
   * Extracts complete threading information from a Gmail message
   * @param message - Gmail message object
   * @returns Threading information
   */
  extractThreadingInfo(message: gmail_v1.Schema$Message): ThreadingInfo {
    const headers = message.payload?.headers;

    if (!headers) {
      this.logger.warn(
        `No headers found for message ${message.id}, returning minimal threading info`
      );
      return {
        subject: '',
        threadId: message.threadId,
      };
    }

    const threadingInfo: ThreadingInfo = {
      messageId: this.getHeaderValue(headers, 'Message-ID'),
      inReplyTo: this.getHeaderValue(headers, 'In-Reply-To'),
      references: this.getHeaderValue(headers, 'References'),
      subject: this.getHeaderValue(headers, 'Subject') || '',
      threadId: message.threadId,
      from: this.getHeaderValue(headers, 'From'),
      to: this.getHeaderValue(headers, 'To'),
    };

    this.logger.debug({
      messageId: message.id,
      threadId: threadingInfo.threadId,
      hasMessageId: !!threadingInfo.messageId,
      hasReferences: !!threadingInfo.references,
    });

    return threadingInfo;
  }

  /**
   * Builds threading headers for a reply
   * RFC 5322: In-Reply-To and References headers maintain thread continuity
   * @param originalMessage - Original message being replied to
   * @returns Headers object for the reply
   */
  buildReplyHeaders(
    originalMessage: gmail_v1.Schema$Message
  ): ReplyThreadingHeaders {
    const threadingInfo = this.extractThreadingInfo(originalMessage);

    const headers: ReplyThreadingHeaders = {
      Subject: this.buildReplySubject(threadingInfo.subject),
    };

    // Add In-Reply-To header (RFC 5322 Section 3.6.4)
    if (threadingInfo.messageId) {
      headers['In-Reply-To'] = threadingInfo.messageId;
    }

    // Build References header (RFC 5322 Section 3.6.4)
    const references = this.buildReferencesHeader(
      threadingInfo.messageId,
      threadingInfo.references
    );

    if (references) {
      headers.References = references;
    }

    return headers;
  }

  /**
   * Builds the References header for a reply
   * RFC 5322: References contains all Message-IDs in the thread
   * @param currentMessageId - Message-ID of the message being replied to
   * @param existingReferences - Existing References header from original message
   * @returns References header value
   */
  buildReferencesHeader(
    currentMessageId?: string,
    existingReferences?: string
  ): string | undefined {
    if (!currentMessageId) {
      return existingReferences;
    }

    // If there are existing references, append the current message ID
    if (existingReferences) {
      // Clean up existing references (remove extra whitespace)
      const cleanedReferences = existingReferences.trim().replace(/\s+/g, ' ');

      // Check if currentMessageId is already in references
      if (cleanedReferences.includes(currentMessageId)) {
        return cleanedReferences;
      }

      return `${cleanedReferences} ${currentMessageId}`;
    }

    // First reply in the thread
    return currentMessageId;
  }

  /**
   * Builds the reply subject with "Re:" prefix
   * @param originalSubject - Subject of the original message
   * @returns Subject with Re: prefix
   */
  buildReplySubject(originalSubject: string): string {
    return MimeUtils.addReplyPrefix(originalSubject);
  }

  /**
   * Builds the forward subject with "Fwd:" prefix
   * @param originalSubject - Subject of the original message
   * @returns Subject with Fwd: prefix
   */
  buildForwardSubject(originalSubject: string): string {
    return MimeUtils.addForwardPrefix(originalSubject);
  }

  /**
   * Extracts the reply-to address from a message
   * Prioritizes Reply-To header, falls back to From
   * @param message - Gmail message
   * @returns Email address to reply to
   */
  extractReplyToAddress(message: gmail_v1.Schema$Message): string | undefined {
    const headers = message.payload?.headers;

    if (!headers) {
      return undefined;
    }

    // Check Reply-To header first (RFC 5322)
    const replyTo = this.getHeaderValue(headers, 'Reply-To');
    if (replyTo) {
      return this.extractEmailAddress(replyTo);
    }

    // Fall back to From header
    const from = this.getHeaderValue(headers, 'From');
    if (from) {
      return this.extractEmailAddress(from);
    }

    return undefined;
  }

  /**
   * Extracts email address from a header value
   * Handles formats like: "Name" <email@example.com> or email@example.com
   * @param headerValue - Email header value
   * @returns Extracted email address
   */
  extractEmailAddress(headerValue: string): string {
    if (!headerValue) {
      return '';
    }

    // Match email in angle brackets: <email@example.com>
    const angleMatch = headerValue.match(/<([^>]+)>/);
    if (angleMatch && angleMatch[1]) {
      return angleMatch[1].trim();
    }

    // Match plain email: email@example.com
    const emailMatch = headerValue.match(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/);
    if (emailMatch) {
      return emailMatch[0].trim();
    }

    // Return as-is if no pattern matches
    return headerValue.trim();
  }

  /**
   * Extracts all recipients from To and Cc headers
   * @param message - Gmail message
   * @returns Array of email addresses
   */
  extractAllRecipients(message: gmail_v1.Schema$Message): string[] {
    const headers = message.payload?.headers;

    if (!headers) {
      return [];
    }

    const to = this.getHeaderValue(headers, 'To') || '';
    const cc = this.getHeaderValue(headers, 'Cc') || '';

    const allRecipients = `${to},${cc}`;
    const addresses = MimeUtils.parseEmailList(allRecipients);

    // Extract just the email addresses
    return addresses.map((addr) => this.extractEmailAddress(addr));
  }

  /**
   * Checks if a message is part of a thread (has replies)
   * @param message - Gmail message
   * @returns True if message has In-Reply-To or References headers
   */
  isPartOfThread(message: gmail_v1.Schema$Message): boolean {
    const threadingInfo = this.extractThreadingInfo(message);
    return !!(threadingInfo.inReplyTo || threadingInfo.references);
  }

  /**
   * Extracts the thread depth based on References header
   * @param message - Gmail message
   * @returns Number of messages in the thread chain
   */
  getThreadDepth(message: gmail_v1.Schema$Message): number {
    const threadingInfo = this.extractThreadingInfo(message);

    if (!threadingInfo.references) {
      return threadingInfo.inReplyTo ? 1 : 0;
    }

    // Count Message-IDs in References header
    const messageIds = threadingInfo.references.match(/<[^>]+>/g);
    return messageIds ? messageIds.length : 0;
  }

  /**
   * Validates threading headers
   * @param headers - Threading headers to validate
   * @returns True if headers are valid
   */
  validateThreadingHeaders(headers: ReplyThreadingHeaders): boolean {
    // Subject is required
    if (!headers.Subject || headers.Subject.trim().length === 0) {
      this.logger.warn('Invalid threading headers: Subject is required');
      return false;
    }

    // If In-Reply-To is present, it should be in proper format
    if (headers['In-Reply-To'] && !/<[^>]+>/.test(headers['In-Reply-To'])) {
      this.logger.warn(`Invalid In-Reply-To format: ${headers['In-Reply-To']}`);
      return false;
    }

    // If References is present, it should contain valid Message-IDs
    if (headers.References) {
      const messageIds = headers.References.match(/<[^>]+>/g);
      if (!messageIds || messageIds.length === 0) {
        this.logger.warn(`Invalid References format: ${headers.References}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Gets header value from headers array
   * @param headers - Array of Gmail message headers
   * @param headerName - Header name to find
   * @returns Header value or undefined
   */
  private getHeaderValue(
    headers: gmail_v1.Schema$MessagePartHeader[],
    headerName: string
  ): string | undefined {
    return MimeUtils.getHeaderValue(headers, headerName);
  }

  /**
   * Generates threading metadata for logging/debugging
   * @param message - Gmail message
   * @returns Metadata object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getThreadingMetadata(message: gmail_v1.Schema$Message): Record<string, any> {
    const threadingInfo = this.extractThreadingInfo(message);

    return {
      messageId: message.id,
      threadId: threadingInfo.threadId,
      hasMessageIdHeader: !!threadingInfo.messageId,
      hasInReplyTo: !!threadingInfo.inReplyTo,
      hasReferences: !!threadingInfo.references,
      isPartOfThread: this.isPartOfThread(message),
      threadDepth: this.getThreadDepth(message),
      subject: threadingInfo.subject,
    };
  }
}
