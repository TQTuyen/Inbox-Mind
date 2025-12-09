export const GOOGLE_SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.labels',
] as const;

export const GOOGLE_PROFILE_URL =
  'https://www.googleapis.com/oauth2/v3/userinfo';

export const GOOGLE_OAUTH_CONFIG = {
  ACCESS_TYPE: 'offline',
  PROMPT: 'consent',
} as const;

export const GMAIL_CONFIG = {
  USER_ID: 'me',
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  METADATA_HEADERS: ['From', 'To', 'Subject', 'Date'],
  EMAIL_CONTENT_TYPE: 'text/html; charset=utf-8',
} as const;
