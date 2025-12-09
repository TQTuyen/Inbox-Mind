export const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  GOOGLE_ACCESS_TOKEN_CACHE_TTL: 50 * 60 * 1000, // 50 minutes
} as const;

export const COOKIE_CONFIG = {
  REFRESH_TOKEN_NAME: 'refreshToken',
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SAME_SITE: 'lax' as const,
} as const;
