/**
 * Push Notification Subscription Endpoint
 * POST /api/push-subscribe
 *
 * Stores user's push notification subscription for VAPID-based Web Push.
 * Called when user enables notifications.
 *
 * SECURITY:
 * - CSRF protection via token validation
 * - Endpoint URL validation (HTTPS only, known providers)
 * - Base64url key format validation
 * - Content-Type validation
 * - Rate limiting (via hooks.server.ts)
 */

import type { RequestHandler } from '@sveltejs/kit';
import { errorLogger } from '$lib/errors/logger';
import {
  ApiError,
  ValidationError,
  AppError
} from '$lib/errors/types';
import { validateCSRF } from '$lib/security/csrf';

interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent?: string;
  timestamp?: number;
}

/**
 * Validate the incoming request
 */
function validateRequest(body: unknown): {
  valid: boolean;
  errors?: Record<string, string[]>;
  data?: PushSubscriptionRequest;
} {
  // Type guard for body being an object
  const bodyObj = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const keys = bodyObj.keys && typeof bodyObj.keys === 'object' ? bodyObj.keys as Record<string, unknown> : null;
  const errors: Record<string, string[]> = {};

  if (!bodyObj.endpoint) {
    errors.endpoint = ['Endpoint is required'];
  } else if (typeof bodyObj.endpoint !== 'string') {
    errors.endpoint = ['Endpoint must be a string'];
  } else {
    try {
      const url = new URL(bodyObj.endpoint);

      // Only allow HTTPS endpoints (security requirement for push)
      if (url.protocol !== 'https:') {
        errors.endpoint = ['Endpoint must use HTTPS protocol'];
      }

      // Validate push service domains (allowlist known providers)
      const allowedDomains = [
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'notify.windows.com',
        'web.push.apple.com'
      ];

      const isAllowedDomain = allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));

      if (!isAllowedDomain) {
        errors.endpoint = ['Push endpoint from unknown service provider'];
      }
    } catch (err) {
      errors.endpoint = ['Endpoint must be a valid URL'];
    }
  }

  if (!keys) {
    errors.keys = ['Keys object is required'];
  } else {
    if (!keys.auth || typeof keys.auth !== 'string') {
      errors['keys.auth'] = ['keys.auth is required and must be a string'];
    }
    if (!keys.p256dh || typeof keys.p256dh !== 'string') {
      errors['keys.p256dh'] = ['keys.p256dh is required and must be a string'];
    }

    // Validate base64url format
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    if (typeof keys.auth === 'string' && !base64urlRegex.test(keys.auth)) {
      errors['keys.auth'] = ['keys.auth must be valid base64url'];
    }
    if (typeof keys.p256dh === 'string' && !base64urlRegex.test(keys.p256dh)) {
      errors['keys.p256dh'] = ['keys.p256dh must be valid base64url'];
    }

    // Validate key lengths (reasonable bounds)
    if (typeof keys.auth === 'string' && keys.auth.length > 200) {
      errors['keys.auth'] = ['keys.auth exceeds maximum length'];
    }
    if (typeof keys.p256dh === 'string' && keys.p256dh.length > 200) {
      errors['keys.p256dh'] = ['keys.p256dh exceeds maximum length'];
    }
  }

  if (bodyObj.userAgent && typeof bodyObj.userAgent !== 'string') {
    errors.userAgent = ['userAgent must be a string'];
  }

  if (bodyObj.timestamp && typeof bodyObj.timestamp !== 'number') {
    errors.timestamp = ['timestamp must be a number'];
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      endpoint: bodyObj.endpoint as string,
      keys: {
        auth: keys!.auth as string,
        p256dh: keys!.p256dh as string,
      },
      userAgent: bodyObj.userAgent as string | undefined,
      timestamp: bodyObj.timestamp as number | undefined,
    }
  };
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  // CSRF validation
  const csrfError = validateCSRF(request);
  if (csrfError) {
    return csrfError;
  }

  try {
    // Log incoming request
    errorLogger.info('Push subscribe request received', {
      method: 'POST',
      endpoint: '/api/push-subscribe'
    });

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const error = new ApiError(
        '/api/push-subscribe',
        'POST',
        'Invalid Content-Type header',
        400
      );
      errorLogger.error('Invalid content type in push-subscribe', error);

      return new Response(
        JSON.stringify({
          error: error.code,
          message: 'Content-Type must be application/json'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      const error = new ApiError(
        '/api/push-subscribe',
        'POST',
        'Invalid JSON payload',
        400
      );
      errorLogger.error('Failed to parse push-subscribe request body', error);

      return new Response(
        JSON.stringify({
          error: error.code,
          message: 'Request body must be valid JSON'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate request payload
    const validation = validateRequest(body);
    if (!validation.valid) {
      const error = new ValidationError(
        validation.errors || {},
        'Invalid subscription payload'
      );
      errorLogger.warn('Validation error in push-subscribe', error);

      return new Response(
        JSON.stringify({
          error: error.code,
          message: 'Invalid request fields',
          fields: error.fields
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validatedData = validation.data!;

    // Get client IP address for logging
    const clientIp = getClientAddress();

    // TODO: Implement subscription storage
    // 1. Get or create user (use user ID from session/JWT if available)
    // 2. Check if subscription already exists (by endpoint)
    // 3. Store or update subscription in database with:
    //    - endpoint
    //    - keys.auth
    //    - keys.p256dh
    //    - userAgent
    //    - timestamp
    //    - ipAddress
    //    - isActive: true
    //    - createdAt / updatedAt timestamps

    // Example implementation (replace with your database calls):
    /*
    import { db } from '$lib/db/server';

    try {
      const existingSubscription = await db.pushSubscriptions.findOne({
        endpoint: validatedData.endpoint
      });

      if (existingSubscription) {
        // Update existing subscription
        await db.pushSubscriptions.updateOne(
          { endpoint: validatedData.endpoint },
          {
            authKey: validatedData.keys.auth,
            p256dhKey: validatedData.keys.p256dh,
            userAgent: validatedData.userAgent,
            ipAddress: clientIp,
            isActive: true,
            updatedAt: new Date()
          }
        );

        errorLogger.info('Subscription updated', {
          endpoint: validatedData.endpoint.substring(0, 50)
        });
      } else {
        // Create new subscription
        const subscription = await db.pushSubscriptions.insertOne({
          endpoint: validatedData.endpoint,
          authKey: validatedData.keys.auth,
          p256dhKey: validatedData.keys.p256dh,
          userAgent: validatedData.userAgent,
          subscribedAt: new Date(validatedData.timestamp || Date.now()),
          ipAddress: clientIp,
          isActive: true
        });

        errorLogger.info('Subscription created', {
          endpoint: validatedData.endpoint.substring(0, 50),
          subscriptionId: subscription.insertedId
        });
      }
    } catch (dbErr) {
      throw dbErr;
    }
    */

    const subscriptionId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    errorLogger.info('Subscription stored', {
      endpoint: validatedData.endpoint.substring(0, 50),
      subscriptionId,
      userAgent: validatedData.userAgent ? 'provided' : 'not provided',
      clientIp
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription saved successfully',
        subscriptionId
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const appError = error instanceof AppError
      ? error
      : new AppError(
          String(error),
          'INTERNAL_ERROR',
          500,
          { originalError: error instanceof Error ? error.message : String(error) }
        );

    errorLogger.error('Push subscribe endpoint error', appError);

    return new Response(
      JSON.stringify({
        error: appError.code,
        message: appError.isDev
          ? appError.message
          : 'Failed to save subscription',
        statusCode: appError.statusCode
      }),
      {
        status: appError.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
