import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Check if correlation ID already exists in headers
    const correlationId = req.headers['x-correlation-id'] || uuidv4();

    // Normalize to string
    const finalCorrelationId = Array.isArray(correlationId)
      ? correlationId[0]
      : correlationId;

    // Attach to request object for easy access in controllers/services
    req.id = finalCorrelationId;

    // Set in response header for client tracking
    res.setHeader('X-Correlation-ID', finalCorrelationId);

    next();
  }
}
