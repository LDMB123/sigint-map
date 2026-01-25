/**
 * Push Notification Unsubscription Endpoint
 * POST /api/push-unsubscribe
 *
 * Removes a push notification subscription when user disables notifications.
 * Called when user explicitly unsubscribes or subscription becomes invalid.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { errorLogger } from '$lib/errors/logger';
import {
  ApiError,
  ValidationError,
  AppError
} from '$lib/errors/types';

interface PushUnsubscribeRequest {
  endpoint: string;
}

/**
 * Validate the incoming request
 */
function validateRequest(body: any): {
  valid: boolean;
  errors?: Record<string, string[]>;
  data?: PushUnsubscribeRequest;
} {
  const errors: Record<string, string[]> = {};

  if (!body.endpoint) {
    errors.endpoint = ['Endpoint is required'];
  } else if (typeof body.endpoint !== 'string') {
    errors.endpoint = ['Endpoint must be a string'];
  } else if (!body.endpoint.startsWith('https://') && !body.endpoint.startsWith('http://')) {
    errors.endpoint = ['Endpoint must be a valid HTTP(S) URL'];
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      endpoint: body.endpoint
    }
  };
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Log incoming request
    errorLogger.info('Push unsubscribe request received', {
      method: 'POST',
      endpoint: '/api/push-unsubscribe'
    });

    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (contentType !== 'application/json') {
      const error = new ApiError(
        '/api/push-unsubscribe',
        'POST',
        'Invalid Content-Type header',
        400
      );
      errorLogger.error('Invalid content type in push-unsubscribe', error);

      return new Response(
        JSON.stringify({
          error: error.code,
          message: 'Content-Type must be application/json'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      const error = new ApiError(
        '/api/push-unsubscribe',
        'POST',
        'Invalid JSON payload',
        400
      );
      errorLogger.error('Failed to parse push-unsubscribe request body', error);

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
        'Invalid request payload'
      );
      errorLogger.warn('Validation error in push-unsubscribe', error);

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

    // TODO: Implement subscription removal
    // 1. Find subscription by endpoint
    // 2. Mark as inactive or delete
    // 3. Log the unsubscription

    // Example implementation (replace with your database calls):
    /*
    import { db } from '$lib/db/server';

    try {
      const result = await db.pushSubscriptions.updateOne(
        { endpoint: validatedData.endpoint },
        {
          isActive: false,
          unsubscribedAt: new Date(),
          unsubscribeReason: 'user-requested'
        }
      );

      if (result.matchedCount === 0) {
        errorLogger.warn('Subscription not found for endpoint', undefined, {
          endpoint: validatedData.endpoint.substring(0, 50)
        });

        return new Response(
          JSON.stringify({ error: 'NOT_FOUND', message: 'Subscription not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      errorLogger.info('Subscription removed', {
        endpoint: validatedData.endpoint.substring(0, 50),
        matched: result.matchedCount,
        modified: result.modifiedCount
      });
    } catch (dbErr) {
      throw dbErr;
    }
    */

    errorLogger.info('Subscription marked for removal', {
      endpoint: validatedData.endpoint.substring(0, 50)
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription removed successfully'
      }),
      {
        status: 200,
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

    errorLogger.error('Push unsubscribe endpoint error', appError);

    return new Response(
      JSON.stringify({
        error: appError.code,
        message: appError.isDev
          ? appError.message
          : 'Failed to remove subscription',
        statusCode: appError.statusCode
      }),
      {
        status: appError.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
