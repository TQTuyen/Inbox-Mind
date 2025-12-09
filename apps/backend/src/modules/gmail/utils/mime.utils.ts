import { randomBytes } from 'crypto';

/**
 * MIME Utility Class
 * Provides RFC-compliant MIME encoding and boundary generation utilities
 */
export class MimeUtils {
  /**
   * Generates a unique MIME boundary string
   * RFC 2046: Boundary must be unique and not appear in the message body
   * @returns A unique boundary string
   */
  static generateBoundary(): string {
    return `----=_Part_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Encodes string to Base64 (RFC 2045)
   * @param data - String data to encode
   * @returns Base64 encoded string
   */
  static encodeBase64(data: string): string {
    return Buffer.from(data, 'utf-8').toString('base64');
  }

  /**
   * Encodes binary data to Base64
   * @param data - Buffer containing binary data
   * @returns Base64 encoded string
   */
  static encodeBase64Binary(data: Buffer): string {
    return data.toString('base64');
  }

  /**
   * Encodes string to Base64URL format (Gmail API requirement)
   * RFC 4648: Base64URL encoding with no padding
   * @param data - String data to encode
   * @returns Base64URL encoded string without padding
   */
  static encodeBase64Url(data: string): string {
    return Buffer.from(data, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Decodes Base64URL string to UTF-8
   * @param data - Base64URL encoded string
   * @returns Decoded UTF-8 string
   */
  static decodeBase64Url(data: string): string {
    // Restore padding
    const padding = '='.repeat((4 - (data.length % 4)) % 4);
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Decodes Base64 string to Buffer
   * @param data - Base64 encoded string
   * @returns Buffer containing decoded data
   */
  static decodeBase64ToBuffer(data: string): Buffer {
    return Buffer.from(data, 'base64');
  }

  /**
   * Encodes header value according to RFC 2047 (MIME encoded-word)
   * Used for non-ASCII characters in email headers
   * @param value - Header value to encode
   * @returns RFC 2047 encoded header value
   */
  static encodeHeaderValue(value: string): string {
    // Check if encoding is needed (contains non-ASCII characters)
    const regex = /[\u0080-\uFFFF]/;
    if (!regex.test(value)) {
      return value;
    }

    // RFC 2047: =?charset?encoding?encoded-text?=
    const encoded = Buffer.from(value, 'utf-8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  /**
   * Sanitizes filename for MIME headers
   * Removes or replaces characters that could break MIME formatting
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/["\r\n]/g, '') // Remove quotes and line breaks
      .replace(/\\/g, '/') // Replace backslashes
      .trim();
  }

  /**
   * Gets MIME type from filename extension
   * @param filename - File name
   * @returns MIME type string
   */
  static getMimeType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',

      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      ico: 'image/x-icon',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',

      // Media
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wav: 'audio/wav',

      // Web
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',

      // Others
      eml: 'message/rfc822',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Formats email address (handles name and email)
   * @param email - Email address
   * @param name - Optional display name
   * @returns Formatted email address
   */
  static formatEmailAddress(email: string, name?: string): string {
    if (!name) {
      return email;
    }

    // RFC 5322: "Display Name" <email@example.com>
    const encodedName = this.encodeHeaderValue(name);
    return `"${encodedName}" <${email}>`;
  }

  /**
   * Splits content into chunks for base64 encoding
   * RFC 2045: Lines should not exceed 76 characters
   * @param content - Content to chunk
   * @param lineLength - Maximum line length (default: 76)
   * @returns Chunked content with CRLF line breaks
   */
  static chunkBase64(content: string, lineLength = 76): string {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += lineLength) {
      chunks.push(content.substring(i, i + lineLength));
    }
    return chunks.join('\r\n');
  }

  /**
   * Creates a Message-ID header value
   * RFC 5322: Message-ID format
   * @param domain - Domain name (e.g., 'gmail.com')
   * @returns Message-ID string
   */
  static generateMessageId(domain = 'mail.gmail.com'): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `<${timestamp}.${random}@${domain}>`;
  }

  /**
   * Validates email address format
   * Basic RFC 5322 compliant validation
   * @param email - Email address to validate
   * @returns True if valid email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extracts email addresses from a comma-separated string
   * @param emailString - Comma-separated email addresses
   * @returns Array of trimmed email addresses
   */
  static parseEmailList(emailString: string): string[] {
    if (!emailString) {
      return [];
    }
    return emailString
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  }

  /**
   * Safely extracts header value from Gmail message
   * @param headers - Array of Gmail message headers
   * @param headerName - Name of the header to extract
   * @returns Header value or undefined
   */
  static getHeaderValue(
    headers: Array<{ name?: string; value?: string }> | undefined,
    headerName: string
  ): string | undefined {
    if (!headers) {
      return undefined;
    }
    const header = headers.find(
      (h) => h.name?.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value;
  }

  /**
   * Formats current date to RFC 5322 format
   * @returns RFC 5322 formatted date string
   */
  static formatRFC5322Date(date: Date = new Date()): string {
    return date.toUTCString();
  }

  /**
   * Cleans and normalizes subject line
   * @param subject - Original subject
   * @returns Cleaned subject
   */
  static cleanSubject(subject: string): string {
    return subject.trim().replace(/\s+/g, ' ');
  }

  /**
   * Adds "Re:" prefix to subject if not already present
   * @param subject - Original subject
   * @returns Subject with Re: prefix
   */
  static addReplyPrefix(subject: string): string {
    const cleanedSubject = this.cleanSubject(subject);
    if (/^re:/i.test(cleanedSubject)) {
      return cleanedSubject;
    }
    return `Re: ${cleanedSubject}`;
  }

  /**
   * Adds "Fwd:" prefix to subject if not already present
   * @param subject - Original subject
   * @returns Subject with Fwd: prefix
   */
  static addForwardPrefix(subject: string): string {
    const cleanedSubject = this.cleanSubject(subject);
    if (/^fwd:/i.test(cleanedSubject)) {
      return cleanedSubject;
    }
    return `Fwd: ${cleanedSubject}`;
  }
}
