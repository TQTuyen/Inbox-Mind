/**
 * Email Builder
 * Builds simple RFC-compliant email messages
 * For more complex emails with attachments, use MimeMultipartBuilder
 */
export class EmailBuilder {
  private from?: string;
  private to?: string;
  private cc?: string;
  private bcc?: string;
  private subject?: string;
  private body?: string;
  private contentType = 'text/html; charset=utf-8';

  setFrom(from: string): this {
    this.from = from;
    return this;
  }

  setTo(to: string): this {
    this.to = to;
    return this;
  }

  setCc(cc: string): this {
    this.cc = cc;
    return this;
  }

  setBcc(bcc: string): this {
    this.bcc = bcc;
    return this;
  }

  setSubject(subject: string): this {
    this.subject = subject;
    return this;
  }

  setBody(body: string): this {
    this.body = body;
    return this;
  }

  setContentType(contentType: string): this {
    this.contentType = contentType;
    return this;
  }

  build(): string {
    const headers = [
      this.from && `From: ${this.from}`,
      this.to && `To: ${this.to}`,
      this.cc && `Cc: ${this.cc}`,
      this.bcc && `Bcc: ${this.bcc}`,
      this.subject && `Subject: ${this.subject}`,
      `Content-Type: ${this.contentType}`,
    ]
      .filter(Boolean)
      .join('\r\n');

    // RFC 2822: Headers + blank line (CRLF CRLF) + body
    return `${headers}\r\n\r\n${this.body || ''}`;
  }

  reset(): this {
    this.from = undefined;
    this.to = undefined;
    this.cc = undefined;
    this.bcc = undefined;
    this.subject = undefined;
    this.body = undefined;
    this.contentType = 'text/html; charset=utf-8';
    return this;
  }
}
