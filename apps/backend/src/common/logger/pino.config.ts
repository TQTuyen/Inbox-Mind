/* eslint-disable @typescript-eslint/no-explicit-any */
import { IncomingMessage, ServerResponse } from 'http';
import { Params } from 'nestjs-pino';
import { join } from 'path';
import * as pino from 'pino';
import { NodeEnv } from '../enums';
import { LOG_LEVEL, PINO_CONFIG } from './logger.constants';

export function createPinoConfig(nodeEnv: string): Params {
  const isDevelopment = nodeEnv === NodeEnv.DEVELOPMENT;
  const isProduction = nodeEnv === NodeEnv.PRODUCTION;
  const isTest = nodeEnv === NodeEnv.TEST;

  // Base pino options with performance optimizations
  const pinoHttpOptions: Params['pinoHttp'] = {
    level: isTest
      ? LOG_LEVEL.TEST
      : isDevelopment
      ? LOG_LEVEL.DEVELOPMENT
      : LOG_LEVEL.PRODUCTION,

    // Custom log formatter for timestamps
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version,
      }),
    },

    // Timestamp in ISO format
    timestamp: () => `,"time":"${new Date().toISOString()}"`,

    // Redact sensitive fields - critical for production security
    redact: {
      paths: PINO_CONFIG.REDACT_PATHS,
      censor: '[REDACTED]',
    },

    // Request serializers for structured logging
    serializers: {
      req: (req) => ({
        id: (req as any).id,
        method: req.method,
        url: req.url,
        query: (req as any).query,
        params: (req as any).params,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        remoteAddress: (req as any).socket?.remoteAddress,
        remotePort: (req as any).socket?.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.getHeaders?.(),
      }),
      err: pino.stdSerializers.err,
    },

    // Custom properties injector for request context
    customProps: (req: IncomingMessage, _: ServerResponse) => {
      const correlationId =
        (req as any).id ||
        req.headers['x-correlation-id'] ||
        'no-correlation-id';

      return {
        correlationId,
        userId: (req as any).user?.userId || null,
        userAgent: req.headers['user-agent'],
        ip: (req as any).ip || (req as any).socket?.remoteAddress,
      };
    },

    // Auto-logging of HTTP requests
    autoLogging: {
      ignore: (req) => {
        return req.url?.includes('/health') || req.url?.includes('/metrics');
      },
    },

    // Custom success/error messages
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },

    // Custom log level based on response status
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) {
        return 'error';
      }
      if (res.statusCode >= 400) {
        return 'warn';
      }
      if (res.statusCode >= 300) {
        return 'info';
      }
      return 'debug';
    },

    // Development: pretty print with colors
    // Production: JSON output for log aggregation
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: PINO_CONFIG.PRETTY_PRINT_COLORS,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '[{correlationId}] {req.method} {req.url} - {msg}',
          },
        }
      : undefined,
  };

  // Production: Add file-based logging with rotation
  if (isProduction) {
    const logDir = process.env.LOG_DIR || join(process.cwd(), 'logs');

    const destination = pino.destination({
      dest: join(logDir, 'app.log'),
      minLength: PINO_CONFIG.MIN_LENGTH,
      sync: PINO_CONFIG.SYNC,
    });

    // Error log file for errors only
    const errorDestination = pino.destination({
      dest: join(logDir, 'error.log'),
      minLength: PINO_CONFIG.MIN_LENGTH,
      sync: PINO_CONFIG.SYNC,
    });

    // Multi-stream setup for different log levels
    (pinoHttpOptions as any).stream = pino.multistream([
      { stream: destination, level: 'info' },
      { stream: errorDestination, level: 'error' },
    ]);
  }

  return {
    pinoHttp: pinoHttpOptions,
    exclude: ['/health', '/metrics'],
  };
}
