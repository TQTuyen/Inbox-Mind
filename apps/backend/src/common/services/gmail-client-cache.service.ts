import { Injectable } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { IGmailClientCache } from '../interfaces/gmail-client.interface';

interface CachedClient {
  client: gmail_v1.Gmail;
  expiresAt: number;
}

@Injectable()
export class GmailClientCacheService implements IGmailClientCache {
  private readonly cache = new Map<string, CachedClient>();
  private readonly DEFAULT_CACHE_DURATION = 50 * 60 * 1000;

  get(userId: string): gmail_v1.Gmail | null {
    if (!this.has(userId) || this.isExpired(userId)) {
      this.cache.delete(userId);
      return null;
    }
    return this.cache.get(userId)?.client;
  }

  set(userId: string, client: gmail_v1.Gmail, expiresAt?: number): void {
    const expiry = expiresAt || Date.now() + this.DEFAULT_CACHE_DURATION;
    this.cache.set(userId, { client, expiresAt: expiry });
  }

  has(userId: string): boolean {
    return this.cache.has(userId);
  }

  isExpired(userId: string): boolean {
    const cached = this.cache.get(userId);
    return !cached || cached.expiresAt <= Date.now();
  }

  clear(userId: string): void {
    this.cache.delete(userId);
  }

  clearAll(): void {
    this.cache.clear();
  }
}
