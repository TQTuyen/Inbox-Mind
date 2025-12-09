/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException } from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

/**
 * Type guards for error identification
 * These allow TypeScript to narrow error types safely
 */

/**
 * Check if error is HttpException
 */
export function isHttpException(error: unknown): error is HttpException {
  return error instanceof HttpException;
}

/**
 * Check if error is TypeORM QueryFailedError
 */
export function isQueryFailedError(error: unknown): error is QueryFailedError {
  return error instanceof QueryFailedError;
}

/**
 * Check if error is TypeORM EntityNotFoundError
 */
export function isEntityNotFoundError(
  error: unknown
): error is EntityNotFoundError {
  return error instanceof EntityNotFoundError;
}

/**
 * Check if error is a standard Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Check if error has a specific property
 */
export function hasProperty<T extends string>(
  error: unknown,
  property: T
): error is Record<T, unknown> {
  return typeof error === 'object' && error !== null && property in error;
}

/**
 * Check if error is a database error with code
 */
export function isDatabaseErrorWithCode(
  error: unknown
): error is { code: string | number; driverError?: any } {
  return (
    hasProperty(error, 'code') &&
    (typeof error.code === 'string' || typeof error.code === 'number')
  );
}

/**
 * Check if error is a validation error from class-validator
 */
export function isValidationError(error: unknown): error is {
  message: any[];
  error: string;
} {
  return (
    hasProperty(error, 'message') &&
    hasProperty(error, 'error') &&
    Array.isArray((error as any).message)
  );
}

/**
 * Extract error message safely
 */
export function extractErrorMessage(error: unknown): string {
  if (isHttpException(error)) {
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null) {
      return (response as any).message || error.message;
    }
  }

  if (isError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Extract error stack safely
 */
export function extractErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

/**
 * Extract error name safely
 */
export function extractErrorName(error: unknown): string {
  if (isError(error)) {
    return error.name;
  }
  if (isHttpException(error)) {
    return 'HttpException';
  }
  return 'UnknownError';
}
