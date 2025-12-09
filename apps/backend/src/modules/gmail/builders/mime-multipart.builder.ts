import { MimeUtils } from '../utils/mime.utils';

/**
 * Represents a MIME part (body or attachment)
 */
export interface MimePart {
  contentType: string;
  content: string;
  headers?: Record<string, string>;
  encoding?: 'base64' | '7bit' | '8bit' | 'quoted-printable';
  isAttachment?: boolean;
  filename?: string;
}

/**
 * MIME Multipart Builder
 * Builds RFC 2045/2046 compliant multipart MIME messages
 * Supports mixed, alternative, and related multipart types
 */
export class MimeMultipartBuilder {
  private parts: MimePart[] = [];
  private boundary: string;
  private headers: Map<string, string> = new Map();
  private multipartType: 'mixed' | 'alternative' | 'related' = 'mixed';

  constructor() {
    this.boundary = MimeUtils.generateBoundary();
  }

  /**
   * Sets the multipart type
   * @param type - Type of multipart (mixed, alternative, related)
   */
  setMultipartType(
    type: 'mixed' | 'alternative' | 'related'
  ): MimeMultipartBuilder {
    this.multipartType = type;
    return this;
  }

  /**
   * Sets email headers
   * @param name - Header name
   * @param value - Header value
   */
  setHeader(name: string, value: string): MimeMultipartBuilder {
    this.headers.set(name, value);
    return this;
  }

  /**
   * Sets multiple headers at once
   * @param headers - Object containing header key-value pairs
   */
  setHeaders(headers: Record<string, string>): MimeMultipartBuilder {
    Object.entries(headers).forEach(([name, value]) => {
      this.headers.set(name, value);
    });
    return this;
  }

  /**
   * Sets To header
   * @param to - Recipient email address(es)
   */
  setTo(to: string): MimeMultipartBuilder {
    this.headers.set('To', to);
    return this;
  }

  /**
   * Sets From header
   * @param from - Sender email address
   */
  setFrom(from: string): MimeMultipartBuilder {
    this.headers.set('From', from);
    return this;
  }

  /**
   * Sets Subject header
   * @param subject - Email subject
   */
  setSubject(subject: string): MimeMultipartBuilder {
    const encodedSubject = MimeUtils.encodeHeaderValue(subject);
    this.headers.set('Subject', encodedSubject);
    return this;
  }

  /**
   * Sets Cc header
   * @param cc - CC recipient email address(es)
   */
  setCc(cc: string): MimeMultipartBuilder {
    if (cc) {
      this.headers.set('Cc', cc);
    }
    return this;
  }

  /**
   * Sets Bcc header
   * @param bcc - BCC recipient email address(es)
   */
  setBcc(bcc: string): MimeMultipartBuilder {
    if (bcc) {
      this.headers.set('Bcc', bcc);
    }
    return this;
  }

  /**
   * Sets Date header (RFC 5322 format)
   * @param date - Date object (defaults to current date)
   */
  setDate(date: Date = new Date()): MimeMultipartBuilder {
    this.headers.set('Date', MimeUtils.formatRFC5322Date(date));
    return this;
  }

  /**
   * Sets threading headers for email replies
   * @param messageId - Message-ID to reply to
   * @param references - References header value
   */
  setThreadingHeaders(
    messageId?: string,
    references?: string
  ): MimeMultipartBuilder {
    if (messageId) {
      this.headers.set('In-Reply-To', messageId);
    }
    if (references) {
      this.headers.set('References', references);
    }
    return this;
  }

  /**
   * Sets Message-ID header
   * @param messageId - Message ID (auto-generated if not provided)
   */
  setMessageId(messageId?: string): MimeMultipartBuilder {
    const id = messageId || MimeUtils.generateMessageId();
    this.headers.set('Message-ID', id);
    return this;
  }

  /**
   * Adds HTML body part
   * @param html - HTML content
   */
  addHtmlPart(html: string): MimeMultipartBuilder {
    this.parts.push({
      contentType: 'text/html; charset=utf-8',
      content: html,
      encoding: '7bit',
      isAttachment: false,
    });
    return this;
  }

  /**
   * Adds plain text body part
   * @param text - Plain text content
   */
  addTextPart(text: string): MimeMultipartBuilder {
    this.parts.push({
      contentType: 'text/plain; charset=utf-8',
      content: text,
      encoding: '7bit',
      isAttachment: false,
    });
    return this;
  }

  /**
   * Adds an attachment part
   * @param filename - Attachment filename
   * @param mimeType - MIME type of the attachment
   * @param data - Base64 encoded attachment data
   */
  addAttachment(
    filename: string,
    mimeType: string,
    data: string
  ): MimeMultipartBuilder {
    const sanitizedFilename = MimeUtils.sanitizeFilename(filename);
    const encodedFilename = MimeUtils.encodeHeaderValue(sanitizedFilename);

    this.parts.push({
      contentType: mimeType,
      content: data,
      encoding: 'base64',
      isAttachment: true,
      filename: encodedFilename,
      headers: {
        'Content-Disposition': `attachment; filename="${encodedFilename}"`,
        'Content-Transfer-Encoding': 'base64',
      },
    });
    return this;
  }

  /**
   * Adds a custom MIME part
   * @param part - MIME part configuration
   */
  addPart(part: MimePart): MimeMultipartBuilder {
    this.parts.push(part);
    return this;
  }

  /**
   * Builds the complete MIME message
   * @returns RFC-compliant MIME message string
   */
  build(): string {
    const lines: string[] = [];

    // Add main headers
    this.headers.forEach((value, name) => {
      lines.push(`${name}: ${value}`);
    });

    // Add MIME version
    lines.push('MIME-Version: 1.0');

    // Add Content-Type with boundary
    lines.push(
      `Content-Type: multipart/${this.multipartType}; boundary="${this.boundary}"`
    );

    // Blank line after headers (RFC 2822)
    lines.push('');

    // Add preamble (ignored by MIME-compliant clients)
    lines.push('This is a multi-part message in MIME format.');
    lines.push('');

    // Add each MIME part
    this.parts.forEach((part) => {
      lines.push(`--${this.boundary}`);
      lines.push(`Content-Type: ${part.contentType}`);

      // Add custom headers for this part
      if (part.headers) {
        Object.entries(part.headers).forEach(([name, value]) => {
          lines.push(`${name}: ${value}`);
        });
      } else if (part.encoding) {
        lines.push(`Content-Transfer-Encoding: ${part.encoding}`);
      }

      // Blank line before content
      lines.push('');

      // Add content (chunk base64 if needed)
      if (part.encoding === 'base64') {
        lines.push(MimeUtils.chunkBase64(part.content));
      } else {
        lines.push(part.content);
      }

      lines.push('');
    });

    // Add closing boundary
    lines.push(`--${this.boundary}--`);

    // Join with CRLF (RFC 2822)
    return lines.join('\r\n');
  }

  /**
   * Builds and encodes the message for Gmail API
   * @returns Base64URL encoded message
   */
  buildAndEncode(): string {
    const mimeMessage = this.build();
    return MimeUtils.encodeBase64Url(mimeMessage);
  }

  /**
   * Resets the builder to initial state
   */
  reset(): MimeMultipartBuilder {
    this.parts = [];
    this.headers.clear();
    this.boundary = MimeUtils.generateBoundary();
    this.multipartType = 'mixed';
    return this;
  }

  /**
   * Gets current boundary string
   */
  getBoundary(): string {
    return this.boundary;
  }

  /**
   * Sets custom boundary (use with caution)
   * @param boundary - Custom boundary string
   */
  setBoundary(boundary: string): MimeMultipartBuilder {
    this.boundary = boundary;
    return this;
  }
}
