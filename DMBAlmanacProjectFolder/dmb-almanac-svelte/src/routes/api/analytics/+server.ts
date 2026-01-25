import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { errorLogger } from '$lib/errors/logger';
import { ApiError, ValidationError, AppError } from '$lib/errors/types';

/**
 * Web Vitals Analytics Endpoint
 * Collects Core Web Vitals and Long Animation Frame data
 * Chromium 143+ / Apple Silicon optimized
 *
 * SECURITY:
 * - Same-origin CORS policy
 * - Input validation and sanitization
 * - Rate limiting (via hooks.server.ts)
 * - Comprehensive error handling and logging
 */

/**
 * Validates request origin for CORS
 * Only allows same-origin requests
 */
function validateOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // No origin header means same-origin request (not a CORS request)
  if (!origin) {
    return null;
  }

  // Extract hostname from origin
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    // Allow if origin matches host (same-origin)
    if (host && originHost === host) {
      return origin;
    }
  } catch (error) {
    // Invalid origin URL - log and reject
    errorLogger.warn('Invalid origin URL attempted', undefined, {
      origin,
      attemptedAt: new Date().toISOString()
    });
    return null;
  }

  // Reject cross-origin requests by returning null
  return null;
}

/**
 * Validate analytics payload structure
 * Prevents malformed data from being processed
 */
function validatePayload(payload: unknown): payload is AnalyticsPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const p = payload as Record<string, unknown>;

  // WebVital metric validation
  if ('name' in p) {
    return (
      typeof p.name === 'string' &&
      typeof p.value === 'number' &&
      typeof p.rating === 'string' &&
      ['good', 'needs-improvement', 'poor'].includes(p.rating as string)
    );
  }

  // LoAF metric validation
  if ('type' in p && p.type === 'long-animation-frame') {
    return (
      typeof p.duration === 'number' &&
      typeof p.blockingDuration === 'number'
    );
  }

  return false;
}

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

interface LoAFMetric {
  type: 'long-animation-frame';
  duration: number;
  blockingDuration: number;
  renderStart: number;
  styleAndLayoutStart: number;
  url: string;
  scripts?: Array<{
    sourceURL: string;
    sourceFunctionName: string;
    invoker: string;
    invokerType: string;
    duration: number;
  }>;
}

type AnalyticsPayload = WebVitalMetric | LoAFMetric;

/**
 * Build CORS headers for response
 */
function buildCorsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const allowedOrigin = validateOrigin(request);

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return headers;
}

/**
 * POST /api/analytics
 * Accepts Web Vitals and LoAF metrics from clients
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Log incoming request
    errorLogger.info('Analytics metric received', {
      method: 'POST',
      endpoint: '/api/analytics'
    });

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (contentType !== 'application/json') {
      const error = new ApiError(
        '/api/analytics',
        'POST',
        'Invalid Content-Type header',
        400
      );
      errorLogger.error('Invalid content type in analytics', error);

      return json(
        {
          error: error.code,
          message: 'Content-Type must be application/json'
        },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Parse request body
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (err) {
      const error = new ApiError(
        '/api/analytics',
        'POST',
        'Invalid JSON payload',
        400
      );
      errorLogger.error('Failed to parse analytics payload', error);

      return json(
        {
          error: error.code,
          message: 'Request body must be valid JSON'
        },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Validate payload structure
    if (!validatePayload(payload)) {
      const error = new ValidationError(
        { payload: ['Invalid analytics payload structure'] },
        'Invalid payload'
      );
      errorLogger.warn('Validation error in analytics', error);

      return json(
        {
          error: error.code,
          message: 'Invalid payload structure'
        },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Extract client information
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || '';
    const timestamp = new Date().toISOString();

    // Build analytics record
    const record = {
      ...payload,
      timestamp,
      userAgent,
      referer,
      isDev: dev
    };

    // Log analytics data
    try {
      if (dev) {
        // Development: log to console with formatting
        console.debug('[Analytics]', JSON.stringify(record, null, 2));
      } else {
        // Production: log to structured logger
        const metricName = 'name' in payload ? payload.name : payload.type;
        const metricValue = 'value' in payload ? payload.value : payload.duration;

        errorLogger.info(`Analytics: ${metricName}`, {
          metric: metricName,
          value: metricValue,
          rating: 'rating' in payload ? payload.rating : 'n/a',
          url: 'url' in payload ? payload.url : referer
        });
      }
    } catch (logErr) {
      // Don't fail the request if logging fails
      errorLogger.warn('Failed to log analytics metric', undefined, {
        metric: 'name' in payload ? payload.name : payload.type
      });
    }

    // TODO: Send to analytics backend
    // Examples:
    // - Google Analytics 4 (Measurement Protocol)
    // - Vercel Analytics
    // - Custom database (SQLite, PostgreSQL)
    // - Cloud logging (Datadog, Sentry, CloudWatch)

    const headers = buildCorsHeaders(request);

    // Return success response (minimal to avoid blocking client)
    return json({ success: true }, { status: 200, headers });
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            String(error),
            'INTERNAL_ERROR',
            500,
            {
              originalError:
                error instanceof Error ? error.message : String(error)
            }
          );

    errorLogger.error('Analytics endpoint error', appError);

    const headers = buildCorsHeaders(request);

    // Return success even on error to avoid blocking client metrics
    return json(
      {
        success: false,
        error: appError.code,
        message: appError.isDev ? appError.message : 'Failed to process analytics'
      },
      { status: 500, headers }
    );
  }
};

/**
 * OPTIONS /api/analytics
 * CORS preflight support - same-origin only
 */
export const OPTIONS: RequestHandler = async ({ request }) => {
  try {
    const headers = buildCorsHeaders(request);

    // Cache preflight response for 24 hours
    if (Object.keys(headers).length > 0) {
      headers['Access-Control-Max-Age'] = '86400';
    }

    return new Response(null, {
      status: 204,
      headers
    });
  } catch (error) {
    errorLogger.error(
      'Analytics OPTIONS handler error',
      error instanceof Error ? error : new Error(String(error))
    );

    return new Response(null, { status: 500 });
  }
};

/**
 * GET /api/analytics
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
  try {
    errorLogger.info('Analytics health check', {
      endpoint: '/api/analytics'
    });

    return json({
      status: 'ok',
      message: 'Analytics endpoint ready',
      supportedMetrics: [
        'CLS',
        'FCP',
        'INP',
        'LCP',
        'TTFB',
        'long-animation-frame'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    errorLogger.error(
      'Analytics GET handler error',
      error instanceof Error ? error : new Error(String(error))
    );

    return json(
      {
        status: 'error',
        message: 'Analytics endpoint unavailable'
      },
      { status: 503 }
    );
  }
};
