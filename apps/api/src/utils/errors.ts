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

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found`, "NOT_FOUND", 404, id ? { id } : undefined);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, "CONFLICT_ERROR", 409, details);
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502, { service, ...details });
  }
}
