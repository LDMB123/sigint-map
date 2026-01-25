/**
 * Custom Error Types for DMB Almanac
 * Provides granular error handling and categorization
 */

/**
 * Base application error with metadata
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isDev: boolean;
  readonly context?: Record<string, any>;
  readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
    this.timestamp = new Date();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.isDev ? this.stack : undefined
    };
  }
}

/**
 * Errors related to dynamic imports and component loading
 */
export class ComponentLoadError extends AppError {
  constructor(
    componentPath: string,
    originalError: Error,
    context?: Record<string, any>
  ) {
    super(
      `Failed to load component: ${componentPath}. ${originalError.message}`,
      'COMPONENT_LOAD_ERROR',
      400,
      {
        componentPath,
        originalError: originalError.message,
        ...context
      }
    );
    this.name = 'ComponentLoadError';
    Object.setPrototypeOf(this, ComponentLoadError.prototype);
  }
}

/**
 * Errors from asynchronous operations and store subscriptions
 */
export class AsyncError extends AppError {
  constructor(
    operation: string,
    originalError: Error,
    context?: Record<string, any>
  ) {
    super(
      `Async operation failed: ${operation}. ${originalError.message}`,
      'ASYNC_ERROR',
      500,
      {
        operation,
        originalError: originalError.message,
        ...context
      }
    );
    this.name = 'AsyncError';
    Object.setPrototypeOf(this, AsyncError.prototype);
  }
}

/**
 * Errors from API requests
 */
export class ApiError extends AppError {
  readonly endpoint: string;
  readonly method: string;
  readonly responseStatus?: number;

  constructor(
    endpoint: string,
    method: string,
    message: string,
    responseStatus?: number,
    context?: Record<string, any>
  ) {
    const code =
      responseStatus === 400
        ? 'INVALID_REQUEST'
        : responseStatus === 401
          ? 'UNAUTHORIZED'
          : responseStatus === 403
            ? 'FORBIDDEN'
            : responseStatus === 404
              ? 'NOT_FOUND'
              : responseStatus === 429
                ? 'RATE_LIMITED'
                : responseStatus && responseStatus >= 500
                  ? 'SERVER_ERROR'
                  : 'API_ERROR';

    super(
      message,
      code,
      responseStatus || 500,
      {
        endpoint,
        method,
        responseStatus,
        ...context
      }
    );

    this.name = 'ApiError';
    this.endpoint = endpoint;
    this.method = method;
    this.responseStatus = responseStatus;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  readonly fields: Record<string, string[]>;

  constructor(
    fields: Record<string, string[]>,
    message: string = 'Validation failed',
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', 400, {
      fields,
      ...context
    });
    this.name = 'ValidationError';
    this.fields = fields;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Network/connectivity errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    context?: Record<string, any>
  ) {
    super(
      message || 'Network request failed',
      'NETWORK_ERROR',
      503,
      context
    );
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
  readonly timeoutMs: number;

  constructor(
    operation: string,
    timeoutMs: number,
    context?: Record<string, any>
  ) {
    super(
      `Operation "${operation}" timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      408,
      {
        operation,
        timeoutMs,
        ...context
      }
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends AppError {
  readonly operation: string;

  constructor(
    operation: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(
      `Database ${operation} failed: ${message}`,
      'DATABASE_ERROR',
      500,
      {
        operation,
        ...context
      }
    );
    this.name = 'DatabaseError';
    this.operation = operation;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Store subscription errors
 */
export class StoreError extends AppError {
  readonly storeName: string;

  constructor(
    storeName: string,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      `Store "${storeName}" error: ${message}`,
      'STORE_ERROR',
      500,
      {
        storeName,
        originalError: originalError?.message,
        ...context
      }
    );
    this.name = 'StoreError';
    this.storeName = storeName;
    Object.setPrototypeOf(this, StoreError.prototype);
  }
}

/**
 * Telemetry queue operation errors
 */
export class TelemetryError extends AppError {
  readonly errorCode: string;
  readonly statusCode?: number;
  readonly entryId?: number;

  constructor(
    message: string,
    telemetryErrorCode: string,
    statusCode?: number,
    entryId?: number,
    context?: Record<string, any>
  ) {
    super(
      `Telemetry error: ${message}`,
      'TELEMETRY_ERROR',
      statusCode || 500,
      {
        telemetryErrorCode,
        statusCode,
        entryId,
        ...context
      }
    );
    this.name = 'TelemetryError';
    this.errorCode = telemetryErrorCode;
    this.statusCode = statusCode;
    this.entryId = entryId;
    Object.setPrototypeOf(this, TelemetryError.prototype);
  }
}

/**
 * Navigation operation errors
 */
export class NavigationError extends AppError {
  readonly operation: string;
  readonly originalError?: Error;

  constructor(
    operation: string,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(
      `Navigation ${operation} failed: ${message}`,
      'NAVIGATION_ERROR',
      500,
      {
        operation,
        originalError: originalError?.message,
        ...context
      }
    );
    this.name = 'NavigationError';
    this.operation = operation;
    this.originalError = originalError;
    Object.setPrototypeOf(this, NavigationError.prototype);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if error is a TelemetryError
 */
export function isTelemetryError(error: unknown): error is TelemetryError {
  return error instanceof TelemetryError;
}

/**
 * Type guard to check if error is a NavigationError
 */
export function isNavigationError(error: unknown): error is NavigationError {
  return error instanceof NavigationError;
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown, defaultCode: string = 'UNKNOWN_ERROR'): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, defaultCode, 500, {
      originalError: error.message,
      stack: error.stack
    });
  }

  return new AppError(
    String(error),
    defaultCode,
    500,
    { originalError: error }
  );
}
