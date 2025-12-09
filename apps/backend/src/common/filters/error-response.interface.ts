/**
 * Standardized error response interface
 */
export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  errorCode?: string;
  errorType?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
  stack?: string;
  correlationId?: string;
}

/**
 * Database error details
 */
export interface DatabaseErrorDetails {
  table?: string;
  column?: string;
  constraint?: string;
  detail?: string;
  code?: string;
  query?: string;
}

/**
 * Validation error details
 */
export interface ValidationErrorDetails {
  field: string;
  constraints: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
}
