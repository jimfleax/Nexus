/**
 * @file errors.ts
 * @description Custom error classes used throughout the application.
 * @architecture Provides standardized error shapes that are mapped to HTTP responses by the global error handler.
 */

/**
 * @desc Base application error class containing standard HTTP error fields
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * @desc Thrown when request payload validation fails
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

/**
 * @desc Thrown when a requested resource is not found in the database
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found`, "NOT_FOUND", 404, id ? { id } : undefined);
  }
}

/**
 * @desc Thrown when a unique constraint or domain rule conflict occurs
 */
export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "CONFLICT_ERROR", 409, details);
  }
}

/**
 * @desc Thrown when a third-party service (like Google Drive) fails
 */
export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502, { service, ...details });
  }
}
