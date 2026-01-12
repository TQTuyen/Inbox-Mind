import { gmail_v1 } from 'googleapis';

/**
 * Email Parser Utility
 * Extracts and parses content from Gmail API message payloads
 */
export class EmailParserUtils {
  /**
   * Decodes base64url encoded string
   * @param data - Base64url encoded string
   * @returns Decoded UTF-8 string
   */
  private static decodeBase64Url(data: string): string {
    const padding = '='.repeat((4 - (data.length % 4)) % 4);
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Extracts email body from message payload
   * Prioritizes text/plain, falls back to text/html, then snippet
   * @param message - Gmail message object
   * @returns Extracted email body text
   */
  static extractEmailBody(message: gmail_v1.Schema$Message): string {
    // Helper function to recursively extract body from parts
    const extractFromParts = (
      part: gmail_v1.Schema$MessagePart,
      preferPlainText = true
    ): string | null => {
      // Check if this part has the body data
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return this.decodeBase64Url(part.body.data);
      }

      if (part.mimeType === 'text/html' && part.body?.data && !preferPlainText) {
        return this.decodeBase64Url(part.body.data);
      }

      // Recursively check nested parts
      if (part.parts) {
        for (const subPart of part.parts) {
          const body = extractFromParts(subPart, preferPlainText);
          if (body) return body;
        }
      }

      return null;
    };

    let emailBody = '';

    // Try to extract from payload parts (multipart messages)
    if (message.payload?.parts) {
      // First try to get plain text
      emailBody = extractFromParts(message.payload, true) || '';

      // If no plain text, try HTML
      if (!emailBody) {
        emailBody = extractFromParts(message.payload, false) || '';
      }
    }
    // Try single-part message (payload.body.data)
    else if (message.payload?.body?.data) {
      emailBody = this.decodeBase64Url(message.payload.body.data);
    }

    // Fallback to snippet if no body found
    if (!emailBody && message.snippet) {
      emailBody = message.snippet;
    }

    return emailBody;
  }

  /**
   * Extracts email subject from message headers
   * @param message - Gmail message object
   * @returns Email subject or 'No Subject'
   */
  static extractEmailSubject(message: gmail_v1.Schema$Message): string {
    const headers = message.payload?.headers || [];
    const subjectHeader = headers.find(
      (h) => h.name?.toLowerCase() === 'subject'
    );
    return subjectHeader?.value || 'No Subject';
  }

  /**
   * Extracts sender (From) email address from message headers
   * @param message - Gmail message object
   * @returns Sender email address
   */
  static extractFromAddress(message: gmail_v1.Schema$Message): string {
    const headers = message.payload?.headers || [];
    const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from');
    return fromHeader?.value || '';
  }

  /**
   * Extracts recipient (To) email addresses from message headers
   * @param message - Gmail message object
   * @returns Recipient email addresses
   */
  static extractToAddresses(message: gmail_v1.Schema$Message): string {
    const headers = message.payload?.headers || [];
    const toHeader = headers.find((h) => h.name?.toLowerCase() === 'to');
    return toHeader?.value || '';
  }

  /**
   * Extracts email date from message headers
   * @param message - Gmail message object
   * @returns Email date string
   */
  static extractDate(message: gmail_v1.Schema$Message): string {
    const headers = message.payload?.headers || [];
    const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date');
    return dateHeader?.value || '';
  }

  /**
   * Extracts Message-ID from message headers
   * @param message - Gmail message object
   * @returns Message-ID
   */
  static extractMessageId(message: gmail_v1.Schema$Message): string {
    const headers = message.payload?.headers || [];
    const messageIdHeader = headers.find(
      (h) => h.name?.toLowerCase() === 'message-id'
    );
    return messageIdHeader?.value || '';
  }

  /**
   * Extracts all headers as a key-value map
   * @param message - Gmail message object
   * @returns Map of header names to values
   */
  static extractAllHeaders(
    message: gmail_v1.Schema$Message
  ): Map<string, string> {
    const headers = message.payload?.headers || [];
    const headerMap = new Map<string, string>();

    headers.forEach((header) => {
      if (header.name && header.value) {
        headerMap.set(header.name.toLowerCase(), header.value);
      }
    });

    return headerMap;
  }

  /**
   * Strips HTML tags from text (basic implementation)
   * @param html - HTML string
   * @returns Plain text
   */
  static stripHtmlTags(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}
