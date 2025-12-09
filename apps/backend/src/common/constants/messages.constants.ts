export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  INVALID_ACCESS_TOKEN: 'Invalid access token',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  REFRESH_TOKEN_NOT_PROVIDED: 'Refresh token not provided',
  FAILED_TO_AUTHENTICATE_GOOGLE: 'Failed to authenticate with Google',
  FAILED_TO_FETCH_LABELS: 'Failed to fetch labels',
  FAILED_TO_FETCH_EMAILS: 'Failed to fetch emails',
  FAILED_TO_FETCH_EMAIL: 'Failed to fetch email',
  FAILED_TO_SEND_EMAIL: 'Failed to send email',
  FAILED_TO_MODIFY_EMAIL: 'Failed to modify email',
  FAILED_TO_DELETE_EMAIL: 'Failed to delete email',
  FAILED_TO_REVOKE_GOOGLE_TOKENS: 'Failed to revoke Google tokens',
  INVALID_ENCRYPTION_KEY: 'ENCRYPTION_KEY must be exactly 32 characters long',
} as const;

export const SUCCESS_MESSAGES = {
  EMAIL_UPDATED: 'Email updated successfully',
  LABELS_UPDATED: 'Labels updated successfully',
  EMAIL_DELETED: 'Email deleted successfully',
  LOGGED_OUT: 'Logged out successfully',
} as const;
