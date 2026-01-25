/**
 * Centralized Error Handler
 * Routes different error types to appropriate recovery strategies
 */

import { errorLogger } from './logger';
import {
  isAppError,
  isApiError,
  type AppError,
  type ApiError,
  ComponentLoadError,
  AsyncError,
  ValidationError,
  NetworkError,
  TimeoutError
} from './types';

export interface ErrorHandlerOptions {
  showUserMessage?: boolean;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  fallback?: any;
  context?: Record<string, any>;
}

export interface ErrorHandlerResult {
  handled: boolean;
  message: string;
  userMessage: string;
  canRetry: boolean;
  suggestion?: string;
}

/**
 * Handle component load errors
 */
export function handleComponentLoadError(
  error: ComponentLoadError,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  errorLogger.error(
    `Component load failed: ${error.context?.componentPath}`,
    error
  );

  const userMessage =
    'The visualization failed to load. Please refresh the page or try again later.';

  return {
    handled: true,
    message: error.message,
    userMessage,
    canRetry: true,
    suggestion: 'Try refreshing the page or checking your internet connection.'
  };
}

/**
 * Handle async errors from store subscriptions
 */
export function handleAsyncError(
  error: AsyncError,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  errorLogger.error(
    `Async operation failed: ${error.context?.operation}`,
    error
  );

  const userMessage =
    'An operation failed. The page may not be fully functional.';

  return {
    handled: true,
    message: error.message,
    userMessage,
    canRetry: options.retry ?? true,
    suggestion: 'Try refreshing the page or navigating away and back.'
  };
}

/**
 * Handle API errors
 */
export function handleApiError(
  error: ApiError,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  errorLogger.logApiError(
    error.endpoint,
    error.method,
    error.responseStatus || 500,
    error
  );

  let userMessage: string;
  let suggestion: string;
  let canRetry = true;

  if (error.statusCode === 400) {
    userMessage = 'The request was invalid. Please check your input.';
    suggestion = 'Please verify the information you provided.';
    canRetry = false;
  } else if (error.statusCode === 401) {
    userMessage = 'You are not authenticated. Please log in.';
    suggestion = 'Please log in to continue.';
    canRetry = false;
  } else if (error.statusCode === 403) {
    userMessage = 'You do not have permission to perform this action.';
    suggestion = 'Contact support if you believe this is an error.';
    canRetry = false;
  } else if (error.statusCode === 404) {
    userMessage = 'The requested resource was not found.';
    suggestion = 'The item may have been deleted or moved.';
    canRetry = false;
  } else if (error.statusCode === 429) {
    userMessage = 'Too many requests. Please wait a moment and try again.';
    suggestion = 'Wait a few moments before trying again.';
    canRetry = true;
  } else if (error.statusCode && error.statusCode >= 500) {
    userMessage = 'Server error. Our team has been notified. Please try again later.';
    suggestion = 'Try again in a few moments.';
    canRetry = true;
  } else {
    userMessage = 'Network error. Please check your connection and try again.';
    suggestion = 'Check your internet connection and try again.';
    canRetry = true;
  }

  return {
    handled: true,
    message: error.message,
    userMessage,
    canRetry,
    suggestion
  };
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  error: ValidationError,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  errorLogger.error('Validation error', error);

  const fieldList = Object.entries(error.fields)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');

  const userMessage = `Please fix the following issues:\n${fieldList}`;

  return {
    handled: true,
    message: error.message,
    userMessage,
    canRetry: true,
    suggestion: 'Please correct the highlighted fields.'
  };
}

/**
 * Handle network errors
 */
export function handleNetworkError(
  error: NetworkError,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  errorLogger.error('Network error', error);

  const userMessage =
    'Network connection failed. Please check your internet connection and try again.';

  return {
    handled: true,
    message: error.message,
    userMessage,
    canRetry: true,
    suggestion: 'Check your internet connection and try again.'
  };
}

/**
 * Handle timeout errors
 */
export function handleTimeoutError(
  error: TimeoutError,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  errorLogger.error(`Operation timeout: ${error.context?.operation}`, error);

  const userMessage = 'The operation took too long and was cancelled. Please try again.';

  return {
    handled: true,
    message: error.message,
    userMessage,
    canRetry: true,
    suggestion: 'Try again. If the problem persists, check your connection speed.'
  };
}

/**
 * Generic error handler - routes to specific handlers
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): ErrorHandlerResult {
  // Ensure we have an error object
  if (!error) {
    return {
      handled: false,
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred.',
      canRetry: false
    };
  }

  // Handle specific error types
  if (error instanceof ComponentLoadError) {
    return handleComponentLoadError(error, options);
  }

  if (error instanceof AsyncError) {
    return handleAsyncError(error, options);
  }

  if (isApiError(error)) {
    return handleApiError(error as ApiError, options);
  }

  if (error instanceof ValidationError) {
    return handleValidationError(error, options);
  }

  if (error instanceof NetworkError) {
    return handleNetworkError(error, options);
  }

  if (error instanceof TimeoutError) {
    return handleTimeoutError(error, options);
  }

  // Handle generic Error
  if (error instanceof Error) {
    errorLogger.error('Unhandled error', error, options.context);

    return {
      handled: true,
      message: error.message,
      userMessage:
        'An unexpected error occurred. Please try refreshing the page.',
      canRetry: true,
      suggestion: 'Try refreshing the page or contacting support.'
    };
  }

  // Handle unknown types
  const messageStr = String(error);
  errorLogger.error(`Unknown error type: ${messageStr}`, undefined, {
    errorType: typeof error,
    ...options.context
  });

  return {
    handled: false,
    message: messageStr,
    userMessage: 'An unexpected error occurred.',
    canRetry: true
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  context?: Record<string, any>
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        errorLogger.info(
          `Retrying operation (attempt ${attempt + 1}/${maxRetries}) after ${delayMs}ms`,
          context
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  if (lastError) {
    throw new AsyncError(
      'retryOperation',
      lastError,
      { maxRetries, attempts: maxRetries, ...context }
    );
  }

  throw new Error('Retry operation failed');
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorLogger.logAsyncError(fn.name || 'anonymous', error, context);
      throw error;
    }
  }) as T;
}

/**
 * Global error event listener setup
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event: ErrorEvent) => {
      errorLogger.error('Uncaught error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      errorLogger.error('Unhandled promise rejection', event.reason, {
        promise: 'PromiseRejectionEvent'
      });

      // Prevent browser from handling it
      event.preventDefault();
    });

    // Handle resource loading errors
    window.addEventListener(
      'error',
      (event: Event) => {
        if (event.target && event.target !== window) {
          const target = event.target as HTMLElement;
          errorLogger.warn(
            `Resource load failed: ${target.nodeName}`,
            undefined,
            {
              tag: target.nodeName,
              src: (target as any).src || (target as any).href
            }
          );
        }
      },
      true // Use capture phase
    );
  }
}
