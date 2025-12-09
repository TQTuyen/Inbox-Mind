import { gmail_v1 } from 'googleapis';
import { MimeUtils } from '../utils/mime.utils';

/**
 * Email Reply Builder
 * Handles construction of email replies with proper threading headers
 * Extracts and maintains thread continuity following RFC 5322 standards
 */
export class EmailReplyBuilder {
  private originalMessage?: gmail_v1.Schema$Message;
  private replyBody?: string;
  private to?: string;
  private cc?: string;
  private bcc?: string;
  private additionalHeaders: Map<string, string> = new Map();

  /**
   * Sets the original message being replied to
   * @param message - Gmail message object
   */
  setOriginalMessage(message: gmail_v1.Schema$Message): EmailReplyBuilder {
    this.originalMessage = message;
    return this;
  }

  /**
   * Sets the reply body content
   * @param body - Reply message body
   */
  setReplyBody(body: string): EmailReplyBuilder {
    this.replyBody = body;
    return this;
  }

  /**
   * Sets the To recipient
   * @param to - Recipient email address
   */
  setTo(to: string): EmailReplyBuilder {
    this.to = to;
    return this;
  }

  /**
   * Sets CC recipients
   * @param cc - CC email addresses
   */
  setCc(cc?: string): EmailReplyBuilder {
    this.cc = cc;
    return this;
  }

  /**
   * Sets BCC recipients
   * @param bcc - BCC email addresses
   */
  setBcc(bcc?: string): EmailReplyBuilder {
    this.bcc = bcc;
    return this;
  }

  /**
   * Adds a custom header
   * @param name - Header name
   * @param value - Header value
   */
  addHeader(name: string, value: string): EmailReplyBuilder {
    this.additionalHeaders.set(name, value);
    return this;
  }

  /**
   * Extracts the Message-ID from the original message
   * @returns Message-ID or undefined
   */
  private extractMessageId(): string | undefined {
    if (!this.originalMessage?.payload?.headers) {
      return undefined;
    }
    return MimeUtils.getHeaderValue(
      this.originalMessage.payload.headers,
      'Message-ID'
    );
  }

  /**
   * Extracts the References header from the original message
   * @returns References header value or undefined
   */
  private extractReferences(): string | undefined {
    if (!this.originalMessage?.payload?.headers) {
      return undefined;
    }
    return MimeUtils.getHeaderValue(
      this.originalMessage.payload.headers,
      'References'
    );
  }

  /**
   * Builds the References header for the reply
   * RFC 5322: References should include all previous Message-IDs in the thread
   * @returns References header value
   */
  private buildReferencesHeader(): string {
    const messageId = this.extractMessageId();
    const existingReferences = this.extractReferences();

    if (!messageId) {
      return existingReferences || '';
    }

    if (existingReferences) {
      // Append the current message ID to existing references
      return `${existingReferences} ${messageId}`;
    }

    return messageId;
  }

  /**
   * Extracts the Subject from the original message
   * @returns Subject or empty string
   */
  private extractSubject(): string {
    if (!this.originalMessage?.payload?.headers) {
      return '';
    }
    return (
      MimeUtils.getHeaderValue(
        this.originalMessage.payload.headers,
        'Subject'
      ) || ''
    );
  }

  /**
   * Builds the reply subject with "Re:" prefix
   * @returns Subject with Re: prefix
   */
  private buildReplySubject(): string {
    const originalSubject = this.extractSubject();
    return MimeUtils.addReplyPrefix(originalSubject);
  }

  /**
   * Extracts the From address from the original message
   * This is typically used as the default To address for replies
   * @returns From email address
   */
  private extractFromAddress(): string | undefined {
    if (!this.originalMessage?.payload?.headers) {
      return undefined;
    }
    const from = MimeUtils.getHeaderValue(
      this.originalMessage.payload.headers,
      'From'
    );

    if (!from) {
      return undefined;
    }

    // Extract email from "Name <email@example.com>" format
    const emailMatch = from.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : from;
  }

  /**
   * Builds threading headers (In-Reply-To, References)
   * @returns Object containing threading headers
   */
  private buildThreadingHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const messageId = this.extractMessageId();
    const references = this.buildReferencesHeader();

    if (messageId) {
      headers['In-Reply-To'] = messageId;
    }

    if (references) {
      headers['References'] = references;
    }

    return headers;
  }

  /**
   * Validates that required fields are set
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.originalMessage) {
      throw new Error('Original message must be set');
    }

    if (!this.replyBody) {
      throw new Error('Reply body must be set');
    }

    if (!this.to) {
      // If To is not explicitly set, use the From address of the original message
      const fromAddress = this.extractFromAddress();
      if (!fromAddress) {
        throw new Error(
          'To address must be set or original message must have a From address'
        );
      }
      this.to = fromAddress;
    }
  }

  /**
   * Builds the complete email reply
   * @returns RFC-compliant email string
   */
  build(): string {
    this.validate();

    const headers: string[] = [];
    const threadingHeaders = this.buildThreadingHeaders();
    const subject = this.buildReplySubject();

    // Add To header
    headers.push(`To: ${this.to}`);

    // Add optional CC
    if (this.cc) {
      headers.push(`Cc: ${this.cc}`);
    }

    // Add optional BCC
    if (this.bcc) {
      headers.push(`Bcc: ${this.bcc}`);
    }

    // Add Subject
    headers.push(`Subject: ${MimeUtils.encodeHeaderValue(subject)}`);

    // Add threading headers
    Object.entries(threadingHeaders).forEach(([name, value]) => {
      headers.push(`${name}: ${value}`);
    });

    // Add additional custom headers
    this.additionalHeaders.forEach((value, name) => {
      headers.push(`${name}: ${value}`);
    });

    // Add Content-Type
    headers.push('Content-Type: text/html; charset=utf-8');

    // Build complete message: headers + blank line + body
    const headerBlock = headers.join('\r\n');
    return `${headerBlock}\r\n\r\n${this.replyBody}`;
  }

  /**
   * Builds reply data for Gmail API (includes threadId)
   * @returns Object containing raw message and threadId
   */
  buildForGmailApi(): { raw: string; threadId?: string } {
    const emailContent = this.build();
    const encoded = MimeUtils.encodeBase64Url(emailContent);

    return {
      raw: encoded,
      threadId: this.originalMessage?.threadId || undefined,
    };
  }

  /**
   * Resets the builder to initial state
   */
  reset(): EmailReplyBuilder {
    this.originalMessage = undefined;
    this.replyBody = undefined;
    this.to = undefined;
    this.cc = undefined;
    this.bcc = undefined;
    this.additionalHeaders.clear();
    return this;
  }

  /**
   * Static factory method to create a reply from a message
   * @param message - Original Gmail message
   * @param replyBody - Reply content
   * @param to - Optional To override (defaults to From of original)
   * @returns Configured EmailReplyBuilder
   */
  static createReply(
    message: gmail_v1.Schema$Message,
    replyBody: string,
    to?: string
  ): EmailReplyBuilder {
    const builder = new EmailReplyBuilder();
    builder.setOriginalMessage(message).setReplyBody(replyBody);

    if (to) {
      builder.setTo(to);
    }

    return builder;
  }
}
