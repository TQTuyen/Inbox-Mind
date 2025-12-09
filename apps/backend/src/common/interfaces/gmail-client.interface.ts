import { gmail_v1 } from 'googleapis';

export interface IGmailClientFactory {
  createClient(userId: string): Promise<gmail_v1.Gmail>;
}

export interface IGmailClientCache {
  get(userId: string): gmail_v1.Gmail | null;
  set(userId: string, client: gmail_v1.Gmail, expiresAt?: number): void;
  has(userId: string): boolean;
  isExpired(userId: string): boolean;
}
