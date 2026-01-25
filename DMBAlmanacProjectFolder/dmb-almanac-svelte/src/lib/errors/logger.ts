/**
 * Error Logging Service for DMB Almanac
 * Structured logging with context and severity levels
 */

import { isAppError, type AppError } from './types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  error?: Error | AppError;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  url?: string;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  errorName?: string;
  errorCode?: string;
  statusCode?: number;
  context?: Record<string, any>;
  stack?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  isDev?: boolean;
}

class ErrorLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private sessionId: string;
  private isDev: boolean;
  private errorHandlers: ((entry: ErrorReport) => Promise<void>)[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(6);
    const message = entry.message;
    const errorInfo = entry.error
      ? ` | ${entry.error.name}: ${entry.error.message}`
      : '';

    return `[${timestamp}] ${level} ${message}${errorInfo}`;
  }

  /**
   * Log a message at specified level
   */
  log(
    level: LogLevel,
    message: string,
    error?: Error | AppError,
    context?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      error,
      context,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output based on level
    const formatted = this.formatLogMessage(entry);

    if (this.isDev) {
      switch (level) {
        case 'debug':
          console.debug(formatted, entry.context);
          break;
        case 'info':
          console.info(formatted, entry.context);
          break;
        case 'warn':
          console.warn(formatted, entry.context);
          break;
        case 'error':
        case 'fatal':
          console.error(formatted, entry.context);
          if (error?.stack) {
            console.error(error.stack);
          }
          break;
      }
    } else {
      // Production: only log warn and above
      if (['warn', 'error', 'fatal'].includes(level)) {
        console.error(formatted, entry.context);
      }
    }

    // Fire error handlers for error and fatal
    if (['error', 'fatal'].includes(level)) {
      this.notifyHandlers({
        id: this.generateErrorId(),
        timestamp: entry.timestamp,
        level,
        message,
        errorName: error?.name,
        errorCode: isAppError(error) ? error.code : undefined,
        statusCode: isAppError(error) ? error.statusCode : undefined,
        context: error && isAppError(error) ? error.context : context,
        stack: error?.stack,
        sessionId: this.sessionId,
        url: entry.url,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        isDev: this.isDev
      });
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, undefined, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, undefined, context);
  }

  /**
   * Log warning
   */
  warn(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('warn', message, error, context);
  }

  /**
   * Log error with full context
   */
  error(message: string, error?: Error | AppError, context?: Record<string, any>): void {
    this.log('error', message, error, context);
  }

  /**
   * Log fatal error (requires immediate action)
   */
  fatal(message: string, error?: Error | AppError, context?: Record<string, any>): void {
    this.log('fatal', message, error, context);
  }

  /**
   * Log error from async operation
   */
  logAsyncError(
    operation: string,
    error: unknown,
    context?: Record<string, any>
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.error(
      `Async operation failed: ${operation}`,
      errorObj,
      context
    );
  }

  /**
   * Log API error
   */
  logApiError(
    endpoint: string,
    method: string,
    status: number,
    error: unknown,
    context?: Record<string, any>
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.error(
      `API ${method} ${endpoint} returned ${status}`,
      errorObj,
      {
        endpoint,
        method,
        status,
        ...context
      }
    );
  }

  /**
   * Register error handler (for sending to external service)
   */
  onError(handler: (entry: ErrorReport) => Promise<void>): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Send error to all registered handlers
   */
  private async notifyHandlers(report: ErrorReport): Promise<void> {
    for (const handler of this.errorHandlers) {
      try {
        await handler(report);
      } catch (err) {
        // Don't throw, just log
        console.error('Error handler failed:', err);
      }
    }
  }

  /**
   * Get recent logs
   */
  getLogs(limit: number = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get error logs only
   */
  getErrorLogs(limit: number = 20): LogEntry[] {
    return this.logs
      .filter(l => ['error', 'fatal'].includes(l.level))
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global singleton instance
export const errorLogger = new ErrorLogger();

/**
 * Development helper: Enable verbose logging
 */
export function enableVerboseLogging(): void {
  const originalLog = errorLogger.log.bind(errorLogger);
  const originalLogAsyncError = errorLogger.logAsyncError.bind(errorLogger);

  // Enhance logging with additional context
  errorLogger.log = function (level, message, error, context) {
    originalLog(level, message, error, {
      ...context,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * Development helper: Get diagnostic report
 */
export function getDiagnosticReport(): {
  sessionId: string;
  timestamp: Date;
  errorCount: number;
  warningCount: number;
  recentErrors: LogEntry[];
  userAgent: string;
  url: string;
} {
  const logs = errorLogger.getLogs();

  // Single-pass counting instead of multiple filter().length
  let errorCount = 0;
  let warningCount = 0;
  for (const l of logs) {
    if (l.level === 'error') errorCount++;
    else if (l.level === 'warn') warningCount++;
  }

  return {
    sessionId: errorLogger.getSessionId(),
    timestamp: new Date(),
    errorCount,
    warningCount,
    recentErrors: errorLogger.getErrorLogs(10),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  };
}
