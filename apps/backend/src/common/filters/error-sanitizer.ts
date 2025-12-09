/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DB_ERROR_MESSAGES,
  MYSQL_ERROR_CODES,
  POSTGRES_ERROR_CODES,
} from './error-codes.constants';

/**
 * Extract table name from database error
 */
export function extractTableName(error: any): string | undefined {
  // PostgreSQL
  if (error.table) {
    return error.table;
  }

  // MySQL - parse from message
  if (error.message) {
    const tableMatch = error.message.match(/table ['"`]([^'"`]+)['"`]/i);
    if (tableMatch) {
      return tableMatch[1];
    }
  }

  return undefined;
}

/**
 * Extract column name from database error
 */
export function extractColumnName(error: any): string | undefined {
  // PostgreSQL
  if (error.column) {
    return error.column;
  }

  // MySQL - parse from message
  if (error.message) {
    const columnMatch = error.message.match(/column ['"`]([^'"`]+)['"`]/i);
    if (columnMatch) {
      return columnMatch[1];
    }
  }

  return undefined;
}

/**
 * Extract constraint name from database error
 */
export function extractConstraintName(error: any): string | undefined {
  // PostgreSQL
  if (error.constraint) {
    return error.constraint;
  }

  // MySQL - parse from message
  if (error.message) {
    const constraintMatch = error.message.match(
      /constraint ['"`]([^'"`]+)['"`]/i
    );
    if (constraintMatch) {
      return constraintMatch[1];
    }
  }

  return undefined;
}

/**
 * Get user-friendly message for database error
 */
export function getDatabaseErrorMessage(errorCode: string | number): string {
  switch (errorCode) {
    case POSTGRES_ERROR_CODES.UNIQUE_VIOLATION:
    case MYSQL_ERROR_CODES.DUPLICATE_ENTRY:
      return DB_ERROR_MESSAGES.UNIQUE_VIOLATION;

    case POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION:
    case MYSQL_ERROR_CODES.FOREIGN_KEY_CONSTRAINT:
      return DB_ERROR_MESSAGES.FOREIGN_KEY_VIOLATION;

    case POSTGRES_ERROR_CODES.NOT_NULL_VIOLATION:
    case MYSQL_ERROR_CODES.NULL_CONSTRAINT:
      return DB_ERROR_MESSAGES.NOT_NULL_VIOLATION;

    case POSTGRES_ERROR_CODES.CHECK_VIOLATION:
      return DB_ERROR_MESSAGES.CHECK_VIOLATION;

    case POSTGRES_ERROR_CODES.SERIALIZATION_FAILURE:
      return DB_ERROR_MESSAGES.SERIALIZATION_FAILURE;

    case POSTGRES_ERROR_CODES.DEADLOCK_DETECTED:
    case MYSQL_ERROR_CODES.DEADLOCK:
      return DB_ERROR_MESSAGES.DEADLOCK_DETECTED;

    case POSTGRES_ERROR_CODES.INVALID_TEXT_REPRESENTATION:
      return DB_ERROR_MESSAGES.INVALID_TEXT_REPRESENTATION;

    default:
      return DB_ERROR_MESSAGES.DEFAULT;
  }
}

/**
 * Sanitize database error for production
 * Removes sensitive information and provides user-friendly messages
 */
export function sanitizeDatabaseError(
  error: any,
  isProduction: boolean
): {
  message: string;

  details?: Record<string, any>;
} {
  const errorCode = error.code;
  const message = getDatabaseErrorMessage(errorCode);

  if (isProduction) {
    // In production, only return user-friendly message
    return { message };
  }

  // In development, include more details

  const details: Record<string, any> = {
    code: errorCode,
  };

  const table = extractTableName(error);
  const column = extractColumnName(error);
  const constraint = extractConstraintName(error);

  if (table) details.table = table;
  if (column) details.column = column;
  if (constraint) details.constraint = constraint;
  if (error.detail) details.detail = error.detail;

  return { message, details };
}

/**
 * Sanitize validation errors
 */
export function sanitizeValidationErrors(validationErrors: any[]): {
  message: string[];
  details: any[];
} {
  const messages: string[] = [];
  const details: any[] = [];

  validationErrors.forEach((error) => {
    if (error.constraints) {
      const constraintMessages = Object.values(error.constraints);
      messages.push(...(constraintMessages as string[]));

      details.push({
        field: error.property,
        constraints: constraintMessages,
        value: error.value,
      });
    }

    // Handle nested validation errors
    if (error.children && error.children.length > 0) {
      const nestedResult = sanitizeValidationErrors(error.children);
      messages.push(...nestedResult.message);
      details.push(...nestedResult.details);
    }
  });

  return { message: messages, details };
}

/**
 * Sanitize generic error for production
 */
export function sanitizeGenericError(
  error: any,
  isProduction: boolean
): string {
  if (isProduction) {
    // Generic message for production
    return 'An internal server error occurred. Please try again later.';
  }

  // Detailed message for development
  return error.message || 'An unexpected error occurred';
}
