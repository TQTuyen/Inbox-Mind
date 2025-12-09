export interface IEmailEncoder {
  encode(emailContent: string): string;
}

export class Base64UrlEmailEncoder implements IEmailEncoder {
  encode(emailContent: string): string {
    return Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
