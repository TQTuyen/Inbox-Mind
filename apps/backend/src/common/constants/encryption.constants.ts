export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-cbc' as const,
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  ENCODING: {
    INPUT: 'utf8' as const,
    OUTPUT: 'hex' as const,
  },
};
