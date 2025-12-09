export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'googleRefreshToken',
  'googleRefreshTokenIV',
  'appRefreshToken',
  'creditCard',
  'ssn',
  'encryptionKey',
] as const;

export const LOG_LEVEL = {
  DEVELOPMENT: 'debug',
  PRODUCTION: 'info',
  TEST: 'silent',
} as const;

export const LOG_FILE_CONFIG = {
  MAX_SIZE: '10m',
  MAX_FILES: 10,
  COMPRESS: true,
  INTERVAL: '1d',
} as const;

export const PINO_CONFIG = {
  MIN_LENGTH: 4096,
  SYNC: false,
  PRETTY_PRINT_COLORS: true,
  REDACT_PATHS: SENSITIVE_FIELDS.flatMap((field) => [
    field,
    `*.${field}`,
    `req.body.${field}`,
    `req.headers.${field}`,
    `res.body.${field}`,
  ]),
} as const;
