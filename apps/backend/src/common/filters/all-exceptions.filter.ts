import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { NodeEnv } from '../enums';
import { AppLoggerService } from '../logger/app-logger.service';
import {
  DB_ERROR_HTTP_STATUS,
  ERROR_CODE_MAPPING,
} from './error-codes.constants';
import { ErrorResponse } from './error-response.interface';
import {
  sanitizeDatabaseError,
  sanitizeGenericError,
  sanitizeValidationErrors,
} from './error-sanitizer';
import {
  extractErrorName,
  extractErrorStack,
  isDatabaseErrorWithCode,
  isEntityNotFoundError,
  isHttpException,
  isQueryFailedError,
  isValidationError,
} from './error-type-guards';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isProduction: boolean;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService
  ) {
    const nodeEnv = this.configService.get<string>(
      'NODE_ENV',
      NodeEnv.DEVELOPMENT
    );
    this.isProduction = nodeEnv === NodeEnv.PRODUCTION;
    this.isDevelopment = nodeEnv === NodeEnv.DEVELOPMENT;
    this.logger.setContext('AllExceptionsFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      request?.id || request.headers?.['x-correlation-id'] || 'unknown';
    const userId = request?.user?.['userId'] || 'anonymous';

    const errorResponse = this.buildErrorResponse(exception, request);
    errorResponse.correlationId = correlationId as string;

    this.logError(exception, request, errorResponse, userId as string);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Handle HttpException
    if (isHttpException(exception)) {
      return this.handleHttpException(exception, timestamp, path, method);
    }

    // Handle TypeORM QueryFailedError (database errors)
    if (isQueryFailedError(exception)) {
      return this.handleQueryFailedError(exception, timestamp, path, method);
    }

    // Handle TypeORM EntityNotFoundError
    if (isEntityNotFoundError(exception)) {
      return this.handleEntityNotFoundError(exception, timestamp, path, method);
    }

    // Handle validation errors (class-validator)
    if (isValidationError(exception)) {
      return this.handleValidationError(exception, timestamp, path, method);
    }

    // Handle all other unexpected errors
    return this.handleGenericError(exception, timestamp, path, method);
  }

  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
    method: string
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let errorCode: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseObj = exceptionResponse as any;
      message = responseObj.message || exception.message;
      errorCode = responseObj.error;
      details = responseObj.details;
    } else {
      message = exception.message;
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp,
      path,
      method,
      message,
      errorType: exception.name,
      errorCode,
    };

    if (details) {
      errorResponse.details = details;
    }

    // Include stack trace in development
    if (this.isDevelopment) {
      errorResponse.stack = exception.stack;
    }

    return errorResponse;
  }

  /**
   * Handle TypeORM QueryFailedError (database constraint violations, etc.)
   */
  private handleQueryFailedError(
    exception: QueryFailedError,
    timestamp: string,
    path: string,
    method: string
  ): ErrorResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driverError = (exception as any).driverError;
    const errorCode = isDatabaseErrorWithCode(driverError)
      ? driverError.code
      : undefined;

    // Map database error code to HTTP status
    const statusCode = errorCode
      ? ERROR_CODE_MAPPING.get(errorCode) ||
        DB_ERROR_HTTP_STATUS.INTERNAL_SERVER_ERROR
      : DB_ERROR_HTTP_STATUS.INTERNAL_SERVER_ERROR;

    // Sanitize error message
    const { message, details: sanitizedDetails } = sanitizeDatabaseError(
      driverError,
      this.isProduction
    );

    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp,
      path,
      method,
      message,
      errorType: 'DatabaseError',
      errorCode: errorCode?.toString(),
    };

    if (sanitizedDetails && !this.isProduction) {
      errorResponse.details = sanitizedDetails;
    }

    // Include stack trace in development
    if (this.isDevelopment) {
      errorResponse.stack = exception.stack;
    }

    return errorResponse;
  }

  /**
   * Handle TypeORM EntityNotFoundError
   */
  private handleEntityNotFoundError(
    exception: EntityNotFoundError,
    timestamp: string,
    path: string,
    method: string
  ): ErrorResponse {
    const message = this.isProduction
      ? 'Resource not found'
      : exception.message;

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.NOT_FOUND,
      timestamp,
      path,
      method,
      message,
      errorType: 'EntityNotFound',
      errorCode: 'ENTITY_NOT_FOUND',
    };

    if (this.isDevelopment) {
      errorResponse.stack = exception.stack;
    }

    return errorResponse;
  }

  /**
   * Handle validation errors from class-validator
   */
  private handleValidationError(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exception: any,
    timestamp: string,
    path: string,
    method: string
  ): ErrorResponse {
    const { message, details } = sanitizeValidationErrors(exception.message);

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp,
      path,
      method,
      message,
      errorType: 'ValidationError',
      errorCode: 'VALIDATION_FAILED',
    };

    if (!this.isProduction) {
      errorResponse.details = { validationErrors: details };
    }

    return errorResponse;
  }

  /**
   * Handle unexpected/generic errors
   */
  private handleGenericError(
    exception: unknown,
    timestamp: string,
    path: string,
    method: string
  ): ErrorResponse {
    const message = sanitizeGenericError(exception, this.isProduction);
    const errorName = extractErrorName(exception);
    const stack = extractErrorStack(exception);

    const errorResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message,
      errorType: errorName,
      errorCode: 'INTERNAL_SERVER_ERROR',
    };

    if (this.isDevelopment && stack) {
      errorResponse.stack = stack;
    }

    return errorResponse;
  }

  /**
   * Log error with full context using pino logger
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
    userId: string
  ): void {
    const { method, url, body, query, params, headers, ip } = request;

    const logContext = {
      correlationId: errorResponse.correlationId,
      error: {
        type: errorResponse.errorType,
        code: errorResponse.errorCode,
        message: errorResponse.message,
        statusCode: errorResponse.statusCode,
        stack: extractErrorStack(exception),
      },
      request: {
        method,
        url,
        body: this.sanitizeRequestBody(body),
        query,
        params,
        userAgent: headers['user-agent'],
        ip,
      },
      user: {
        userId,
      },
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        logContext,
        `[${errorResponse.correlationId}] Server Error: ${method} ${url}`
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        logContext,
        `[${errorResponse.correlationId}] Client Error: ${method} ${url}`
      );
    } else {
      this.logger.info(
        logContext,
        `[${errorResponse.correlationId}] Request processed with error: ${method} ${url}`
      );
    }

    // Log security events for auth failures
    if (errorResponse.statusCode === HttpStatus.UNAUTHORIZED) {
      this.logger.logSecurityEvent('unauthorized_access', 'medium', {
        url,
        method,
        userId,
        ip,
        correlationId: errorResponse.correlationId,
      });
    } else if (errorResponse.statusCode === HttpStatus.FORBIDDEN) {
      this.logger.logSecurityEvent('forbidden_access', 'high', {
        url,
        method,
        userId,
        ip,
        correlationId: errorResponse.correlationId,
      });
    }
  }

  /**
   * Sanitize request body for logging (remove sensitive fields)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'refreshToken',
      'accessToken',
    ];

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
