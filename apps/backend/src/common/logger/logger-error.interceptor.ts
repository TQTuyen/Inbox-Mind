import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AppLoggerService } from './app-logger.service';

@Injectable()
export class LoggerErrorInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params, headers, ip } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = request.user?.userId || 'anonymous';
    // request.id is set by CorrelationIdMiddleware
    const correlationId =
      request?.id || headers['x-correlation-id'] || 'unknown';

    // Start timer for performance tracking
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Log successful requests
        const duration = Date.now() - startTime;
        this.logger.logPerformance(`${method} ${url}`, duration, {
          userId,
          correlationId,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Extract error information
        const errorResponse = this.getErrorResponse(error);
        const statusCode = this.getHttpStatus(error);

        // Log error with full context
        this.logger.error(
          {
            correlationId,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
              statusCode,
              ...errorResponse,
            },
            request: {
              method,
              url,
              body: this.sanitizeBody(body),
              query,
              params,
              userAgent,
              ip,
            },
            user: {
              userId,
            },
            performance: {
              duration_ms: duration,
            },
          },
          `[${correlationId}] Error in ${method} ${url}: ${error.message}`
        );

        // Log security events for specific errors
        if (statusCode === HttpStatus.UNAUTHORIZED) {
          this.logger.logSecurityEvent('unauthorized_access', 'medium', {
            url,
            method,
            userId,
            ip,
            correlationId,
          });
        } else if (statusCode === HttpStatus.FORBIDDEN) {
          this.logger.logSecurityEvent('forbidden_access', 'high', {
            url,
            method,
            userId,
            ip,
            correlationId,
          });
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Extract error response data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getErrorResponse(error: any): any {
    if (error instanceof HttpException) {
      return error.getResponse();
    }
    return {
      message: error.message || 'Internal server error',
    };
  }

  /**
   * Get HTTP status code from error
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getHttpStatus(error: any): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeBody(body: any): any {
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
    ];

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
