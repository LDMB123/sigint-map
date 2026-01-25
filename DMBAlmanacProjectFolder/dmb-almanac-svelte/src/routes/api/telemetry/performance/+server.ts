/**
 * Performance Telemetry API Endpoint
 * Receives Real User Monitoring (RUM) metrics from clients
 * Currently logs to console - swap for real analytics provider later
 *
 * SECURITY:
 * - CSRF protection via token validation
 * - Same-origin CORS policy (no wildcard)
 * - Comprehensive input validation
 * - Rate limiting (via hooks.server.ts)
 *
 * Comprehensive error handling with validation, retry support, and structured logging
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { errorLogger } from '$lib/errors/logger';
import { ApiError, ValidationError, AppError } from '$lib/errors/types';
import type { PerformanceTelemetry } from '$lib/utils/rum';
import { validateCSRF } from '$lib/security/csrf';

/**
 * Validate performance telemetry payload
 */
function validatePerformanceTelemetry(payload: any): {
  valid: boolean;
  errors?: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  if (!payload.sessionId || typeof payload.sessionId !== 'string') {
    errors.sessionId = ['sessionId is required and must be a string'];
  } else {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.sessionId)) {
      errors.sessionId = ['sessionId must be a valid UUID'];
    }
  }

  if (!payload.metrics || !Array.isArray(payload.metrics)) {
    errors.metrics = ['metrics is required and must be an array'];
  } else if (payload.metrics.length === 0) {
    errors.metrics = ['metrics array cannot be empty'];
  } else if (payload.metrics.length > 100) {
    errors.metrics = ['metrics array cannot exceed 100 items'];
  } else {
    // Validate each metric
    payload.metrics.forEach((metric: any, index: number) => {
      if (!metric.name || typeof metric.name !== 'string') {
        errors[`metrics[${index}].name`] = ['Metric name is required'];
      }
      if (typeof metric.value !== 'number' || metric.value < 0) {
        errors[`metrics[${index}].value`] = ['Metric value must be a non-negative number'];
      }
      if (!metric.rating || !['good', 'needs-improvement', 'poor'].includes(metric.rating)) {
        errors[`metrics[${index}].rating`] = ['Metric rating must be good, needs-improvement, or poor'];
      }
    });
  }

  if (!payload.timestamp || typeof payload.timestamp !== 'number') {
    errors.timestamp = ['timestamp is required and must be a number'];
  }

  if (payload.device && typeof payload.device === 'object') {
    if (!payload.device.userAgent || typeof payload.device.userAgent !== 'string') {
      errors['device.userAgent'] = ['device.userAgent is required'];
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

/**
 * Handle OPTIONS request (for CORS preflight check)
 * SECURITY: Changed from wildcard to same-origin only
 */
export const OPTIONS: RequestHandler = async ({ request }) => {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Only allow same-origin requests
  const allowedOrigin = origin && host && new URL(origin).host === host ? origin : null;

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
      'Access-Control-Max-Age': '86400'
    }
  });
};

/**
 * Handle POST request with metrics batch
 * SECURITY: CSRF protection enabled
 */
export const POST: RequestHandler = async ({ request }) => {
  // CSRF validation
  const csrfError = validateCSRF(request);
  if (csrfError) {
    return csrfError;
  }

  try {
    // Log incoming request
    errorLogger.info('Performance telemetry received', {
      method: 'POST',
      endpoint: '/api/telemetry/performance',
      contentType: request.headers.get('content-type')
    });

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const error = new ApiError(
        '/api/telemetry/performance',
        'POST',
        'Invalid Content-Type header',
        400
      );
      errorLogger.error('Invalid content type in telemetry', error);

      return json(
        {
          error: error.code,
          message: 'Content-Type must be application/json'
        },
        { status: 400 }
      );
    }

    // Parse request body
    let payload: any;
    try {
      payload = await request.json();
    } catch (err) {
      const error = new ApiError(
        '/api/telemetry/performance',
        'POST',
        'Invalid JSON payload',
        400
      );
      errorLogger.error('Failed to parse telemetry payload', error);

      return json(
        {
          error: error.code,
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      );
    }

    // Validate payload structure
    const validation = validatePerformanceTelemetry(payload);
    if (!validation.valid) {
      const error = new ValidationError(
        validation.errors || {},
        'Invalid telemetry payload'
      );
      errorLogger.warn('Validation error in performance telemetry', error);

      return json(
        {
          error: error.code,
          message: 'Invalid payload format',
          fields: error.fields
        },
        { status: 400 }
      );
    }

    // Extract client information
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || '';
    const timestamp = new Date().toISOString();

    // Build telemetry record
    const record = {
      ...payload,
      timestamp,
      userAgent,
      referer,
      recordedAt: new Date().toISOString()
    };

    // Process metrics with error handling
    let processedMetrics = 0;
    let skippedMetrics = 0;

    payload.metrics.forEach((metric: any) => {
      try {
        // Color code for console output
        const color =
          metric.rating === 'good'
            ? '\x1b[32m' // Green
            : metric.rating === 'needs-improvement'
              ? '\x1b[33m' // Yellow
              : '\x1b[31m'; // Red
        const reset = '\x1b[0m';

        const logMessage =
          `${color}${metric.name}${reset}: ${metric.value.toFixed(2)}ms (${metric.rating})`;

        if (process.env.NODE_ENV === 'development') {
          console.log(logMessage, {
            url: metric.url,
            navigationType: metric.navigationType,
            wasPrerendered: metric.wasPrerendered,
            attribution: metric.attribution
          });
        }

        processedMetrics++;
      } catch (err) {
        errorLogger.warn(`Failed to process metric: ${metric.name}`, undefined, {
          metric: metric.name,
          error: err instanceof Error ? err.message : String(err)
        });
        skippedMetrics++;
      }
    });

    // Log summary
    errorLogger.info('Performance telemetry processed', {
      sessionId: payload.sessionId,
      metricsCount: payload.metrics.length,
      processedCount: processedMetrics,
      skippedCount: skippedMetrics,
      hasPageLoadId: !!payload.pageLoadId,
      hasDevice: !!payload.device
    });

    // Determine allowed origin for CORS
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const allowedOrigin = origin && host && new URL(origin).host === host ? origin : null;

    return json(
      {
        success: true,
        received: processedMetrics,
        skipped: skippedMetrics
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin || 'null'
        }
      }
    );
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            String(error),
            'INTERNAL_ERROR',
            500,
            {
              originalError: error instanceof Error ? error.message : String(error)
            }
          );

    errorLogger.error('Performance telemetry endpoint error', appError);

    return json(
      {
        error: appError.code,
        message: appError.isDev
          ? appError.message
          : 'Failed to process telemetry',
        statusCode: appError.statusCode
      },
      { status: appError.statusCode }
    );
  }
};
