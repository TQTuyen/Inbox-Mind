/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppLoggerService {
  constructor(
    @InjectPinoLogger(AppLoggerService.name)
    private readonly logger: PinoLogger
  ) {}

  /**
   * Set context for all subsequent logs in this request
   */
  setContext(context: string): void {
    this.logger.setContext(context);
  }

  /**
   * Add persistent bindings for this logger instance
   */
  assign(bindings: Record<string, any>): void {
    this.logger.assign(bindings);
  }

  /**
   * Debug level - development only
   */
  debug(objOrMessage: any, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger.debug(objOrMessage, ...args);
    } else {
      this.logger.debug(objOrMessage, ...args);
    }
  }

  /**
   * Info level - general information
   */
  info(objOrMessage: any, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger.info(objOrMessage, ...args);
    } else {
      this.logger.info(objOrMessage, ...args);
    }
  }

  /**
   * Warn level - warning conditions
   */
  warn(objOrMessage: any, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger.warn(objOrMessage, ...args);
    } else {
      this.logger.warn(objOrMessage, ...args);
    }
  }

  /**
   * Error level - error conditions with stack traces
   */
  error(objOrMessage: any, messageOrTrace?: string, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger.error({ stack: messageOrTrace }, objOrMessage, ...args);
    } else if (objOrMessage instanceof Error) {
      this.logger.error(
        {
          err: objOrMessage,
          stack: objOrMessage.stack,
        },
        messageOrTrace,
        ...args
      );
    } else {
      this.logger.error(objOrMessage, messageOrTrace, ...args);
    }
  }

  /**
   * Fatal level - application crash
   */
  fatal(objOrMessage: any, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger.fatal(objOrMessage, ...args);
    } else {
      this.logger.fatal(objOrMessage, ...args);
    }
  }

  /**
   * Verbose level - detailed information
   */
  verbose(objOrMessage: any, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger.debug(objOrMessage, ...args);
    } else {
      this.logger.debug(objOrMessage, ...args);
    }
  }

  /**
   * Log with custom level
   */
  log(level: string, objOrMessage: any, ...args: any[]): void {
    if (typeof objOrMessage === 'string') {
      this.logger[level](objOrMessage, ...args);
    } else {
      this.logger[level](objOrMessage, ...args);
    }
  }

  /**
   * Structured logging for business events
   */
  logEvent(
    eventName: string,
    data: Record<string, any>,
    level: 'info' | 'warn' | 'error' = 'info'
  ): void {
    this.logger[level](
      {
        event: eventName,
        timestamp: new Date().toISOString(),
        ...data,
      },
      `Event: ${eventName}`
    );
  }

  /**
   * Performance logging
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.logger.info(
      {
        performance: {
          operation,
          duration_ms: duration,
          ...metadata,
        },
      },
      `Performance: ${operation} took ${duration}ms`
    );
  }

  /**
   * Database query logging
   */
  logQuery(query: string, duration: number, params?: any[]): void {
    this.logger.debug(
      {
        database: {
          query,
          duration_ms: duration,
          params: params?.length || 0,
        },
      },
      'Database query executed'
    );
  }

  /**
   * External API call logging
   */
  logApiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level](
      {
        api: {
          method,
          url,
          statusCode,
          duration_ms: duration,
        },
      },
      `External API: ${method} ${url} - ${statusCode}`
    );
  }

  /**
   * Security event logging
   */
  logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ): void {
    const level =
      severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger[level](
      {
        security: {
          eventType,
          severity,
          timestamp: new Date().toISOString(),
          ...details,
        },
      },
      `Security Event: ${eventType}`
    );
  }
}
