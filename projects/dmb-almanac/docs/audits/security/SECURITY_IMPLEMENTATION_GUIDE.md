# Security Implementation Guide - DMB Almanac

**Developer Guide for Security Best Practices**

This guide provides actionable implementation examples for addressing the security audit findings and maintaining secure code practices.

---

## Table of Contents

1. [JWT Key Rotation Implementation](#1-jwt-key-rotation-implementation)
2. [Enhanced Rate Limiting](#2-enhanced-rate-limiting)
3. [File Upload Security](#3-file-upload-security)
4. [CSP Nonce Usage](#4-csp-nonce-usage)
5. [Secure Error Handling](#5-secure-error-handling)
6. [Security Testing Patterns](#6-security-testing-patterns)

---

## 1. JWT Key Rotation Implementation

### Problem
Current implementation uses single JWT secret without rotation mechanism. If secret is compromised, all tokens remain valid indefinitely.

### Solution: Multi-Secret JWT Verification

#### Step 1: Update Environment Variables

```bash
# .env
JWT_SECRET_CURRENT=<new-secret-generated-YYYY-MM-DD>
JWT_SECRET_PREVIOUS=<old-secret-for-grace-period>
JWT_SECRET_ROTATION_DATE=2026-01-26

# Rotation schedule: Every 90 days
```

#### Step 2: Create Key Rotation Module

```javascript
// src/lib/server/jwt-rotation.js

/**
 * JWT Key Rotation Manager
 * Supports multiple active secrets for graceful rotation
 */

const ROTATION_GRACE_PERIOD_DAYS = 7;

/**
 * Get all currently valid JWT secrets
 * @returns {string[]} Array of valid secrets (current + previous)
 */
export function getActiveSecrets() {
    const secrets = [];

    // Current secret (always required)
    const current = process.env.JWT_SECRET_CURRENT || process.env.JWT_SECRET;
    if (!current) {
        throw new Error('JWT_SECRET_CURRENT not configured');
    }
    secrets.push(current);

    // Previous secret (if within grace period)
    const previous = process.env.JWT_SECRET_PREVIOUS;
    const rotationDate = process.env.JWT_SECRET_ROTATION_DATE;

    if (previous && rotationDate) {
        const rotationTime = new Date(rotationDate).getTime();
        const graceEndTime = rotationTime + (ROTATION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

        if (Date.now() < graceEndTime) {
            secrets.push(previous);
        } else {
            console.warn('Previous JWT secret expired - remove from environment');
        }
    }

    return secrets;
}

/**
 * Get secret for signing new tokens (always use current)
 * @returns {string}
 */
export function getSigningSecret() {
    return process.env.JWT_SECRET_CURRENT || process.env.JWT_SECRET;
}

/**
 * Check if rotation is needed
 * @returns {boolean}
 */
export function needsRotation() {
    const rotationDate = process.env.JWT_SECRET_ROTATION_DATE;
    if (!rotationDate) return true; // No rotation date set

    const daysSinceRotation = (Date.now() - new Date(rotationDate).getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceRotation > 90;
}
```

#### Step 3: Update JWT Verification

```javascript
// src/lib/server/jwt.js (update verifyJWT function)

import { getActiveSecrets } from './jwt-rotation.js';

/**
 * Verify JWT token - try all active secrets
 * @param {string} token - JWT token to verify
 * @returns {Promise<object | null>} Decoded payload if valid
 */
export async function verifyJWT(token) {
    const secrets = getActiveSecrets();

    // Try each active secret
    for (const secret of secrets) {
        try {
            const isValid = await verify(token, secret);
            if (!isValid) continue;

            // Decode payload
            const parts = token.split('.');
            const payloadStr = base64urlDecode(parts[1]);
            const payload = JSON.parse(payloadStr);

            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                continue; // Try next secret
            }

            // Success - log which secret was used for monitoring
            const secretIndex = secrets.indexOf(secret);
            if (secretIndex > 0) {
                console.warn('Token verified with previous secret - user should refresh', {
                    kid: payload.kid,
                    secretAge: secretIndex === 0 ? 'current' : 'previous'
                });
            }

            return payload;
        } catch (error) {
            // Try next secret
            continue;
        }
    }

    // All secrets failed
    return null;
}
```

#### Step 4: Update Push Send Endpoint

```javascript
// src/routes/api/push-send/+server.js (update authentication)

import { verifyJWT } from '$lib/server/jwt';
import { getSigningSecret } from '$lib/server/jwt-rotation';

export async function POST({ request, locals }) {
    // ... existing code ...

    // Verify JWT token (tries all active secrets)
    const payload = await verifyJWT(token);

    if (!payload) {
        // REMOVE legacy API key fallback after 30 days
        // Migration period: Allow legacy key but log warning
        const legacyKey = process.env.PUSH_API_KEY;
        const migrationEnd = new Date('2026-02-26'); // 30 days from audit

        if (legacyKey && token === legacyKey && Date.now() < migrationEnd.getTime()) {
            errorLogger.warn('Legacy API key used - MIGRATE TO JWT', {
                ip: request.headers.get('x-forwarded-for'),
                migrationDeadline: migrationEnd.toISOString()
            });
        } else {
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
    }

    // ... rest of handler ...
}
```

#### Step 5: Rotation Script

```javascript
// scripts/rotate-jwt-secret.js

/**
 * JWT Secret Rotation Script
 * Run every 90 days: npm run rotate:jwt-secret
 */

import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync } from 'fs';

function generateSecret() {
    return randomBytes(64).toString('base64');
}

function rotateJWTSecret() {
    // Read current .env
    const envPath = '.env';
    let envContent = readFileSync(envPath, 'utf-8');

    // Get current secret
    const currentMatch = envContent.match(/JWT_SECRET_CURRENT=(.*)/);
    const currentSecret = currentMatch?.[1];

    if (!currentSecret) {
        console.error('JWT_SECRET_CURRENT not found in .env');
        process.exit(1);
    }

    // Generate new secret
    const newSecret = generateSecret();
    const rotationDate = new Date().toISOString().split('T')[0];

    // Update .env
    envContent = envContent.replace(
        /JWT_SECRET_CURRENT=.*/,
        `JWT_SECRET_CURRENT=${newSecret}`
    );

    // Set previous secret (for grace period)
    if (envContent.includes('JWT_SECRET_PREVIOUS=')) {
        envContent = envContent.replace(
            /JWT_SECRET_PREVIOUS=.*/,
            `JWT_SECRET_PREVIOUS=${currentSecret}`
        );
    } else {
        envContent += `\nJWT_SECRET_PREVIOUS=${currentSecret}`;
    }

    // Set rotation date
    if (envContent.includes('JWT_SECRET_ROTATION_DATE=')) {
        envContent = envContent.replace(
            /JWT_SECRET_ROTATION_DATE=.*/,
            `JWT_SECRET_ROTATION_DATE=${rotationDate}`
        );
    } else {
        envContent += `\nJWT_SECRET_ROTATION_DATE=${rotationDate}`;
    }

    // Write updated .env
    writeFileSync(envPath, envContent);

    console.log('✅ JWT secret rotated successfully');
    console.log(`   Rotation Date: ${rotationDate}`);
    console.log(`   Grace Period: 7 days`);
    console.log('   Previous secret will expire on:', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   1. Deploy updated .env to production');
    console.log('   2. Monitor logs for "previous secret" warnings');
    console.log('   3. After 7 days, remove JWT_SECRET_PREVIOUS from .env');
}

rotateJWTSecret();
```

Add to package.json:
```json
{
  "scripts": {
    "rotate:jwt-secret": "node scripts/rotate-jwt-secret.js"
  }
}
```

---

## 2. Enhanced Rate Limiting

### Problem
In-memory rate limiting vulnerable to distributed attacks and memory exhaustion.

### Solution: Redis-Based Distributed Rate Limiting

#### Step 1: Install Redis Client

```bash
npm install ioredis
```

#### Step 2: Create Redis Rate Limiter

```javascript
// src/lib/server/rate-limiter.js

import Redis from 'ioredis';

/**
 * Redis-based distributed rate limiter
 * Uses sliding window with sorted sets for accuracy
 */
class RedisRateLimiter {
    constructor(redisUrl) {
        this.redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true
        });

        this.redis.on('error', (err) => {
            console.error('Redis rate limiter error:', err);
        });
    }

    /**
     * Check rate limit using sliding window
     * @param {string} key - Rate limit key (ip:endpoint)
     * @param {number} maxRequests - Max requests allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
     */
    async checkLimit(key, maxRequests, windowMs) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const resetTime = now + windowMs;

        try {
            // Use Redis pipeline for atomic operations
            const pipeline = this.redis.pipeline();

            // Remove old entries outside window
            pipeline.zremrangebyscore(key, 0, windowStart);

            // Count requests in current window
            pipeline.zcard(key);

            // Add current request
            pipeline.zadd(key, now, `${now}-${Math.random()}`);

            // Set expiration to window size
            pipeline.expire(key, Math.ceil(windowMs / 1000));

            const results = await pipeline.exec();

            // results[1] is the count before adding current request
            const count = results[1][1];
            const allowed = count < maxRequests;
            const remaining = Math.max(0, maxRequests - count - 1);

            return { allowed, remaining, resetTime };
        } catch (error) {
            console.error('Rate limit check error:', error);
            // Fail open - allow request on Redis error
            return { allowed: true, remaining: maxRequests, resetTime };
        }
    }

    /**
     * Clean up expired keys (run periodically)
     */
    async cleanup() {
        try {
            // Redis handles cleanup via EXPIRE, but we can scan for orphaned keys
            let cursor = '0';
            let deletedCount = 0;

            do {
                const [nextCursor, keys] = await this.redis.scan(
                    cursor,
                    'MATCH',
                    'ratelimit:*',
                    'COUNT',
                    100
                );
                cursor = nextCursor;

                for (const key of keys) {
                    const ttl = await this.redis.ttl(key);
                    if (ttl === -1) {
                        // Key without expiration - clean up
                        await this.redis.del(key);
                        deletedCount++;
                    }
                }
            } while (cursor !== '0');

            if (deletedCount > 0) {
                console.log(`Cleaned up ${deletedCount} orphaned rate limit keys`);
            }
        } catch (error) {
            console.error('Rate limit cleanup error:', error);
        }
    }

    async close() {
        await this.redis.quit();
    }
}

/**
 * In-memory fallback rate limiter (development only)
 */
class MemoryRateLimiter {
    constructor() {
        this.store = new Map();
        this.maxSize = 5000;
    }

    async checkLimit(key, maxRequests, windowMs) {
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || entry.resetTime < now) {
            const resetTime = now + windowMs;
            this.store.set(key, { count: 1, resetTime });
            this.cleanup();
            return { allowed: true, remaining: maxRequests - 1, resetTime };
        }

        if (entry.count >= maxRequests) {
            return { allowed: false, remaining: 0, resetTime: entry.resetTime };
        }

        entry.count++;
        return {
            allowed: true,
            remaining: maxRequests - entry.count,
            resetTime: entry.resetTime
        };
    }

    cleanup() {
        if (this.store.size > this.maxSize) {
            const now = Date.now();
            for (const [key, value] of this.store.entries()) {
                if (value.resetTime < now) {
                    this.store.delete(key);
                }
            }
        }
    }

    async close() {
        this.store.clear();
    }
}

/**
 * Create rate limiter based on environment
 */
export function createRateLimiter() {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

    if (redisUrl && process.env.NODE_ENV === 'production') {
        console.log('✅ Using Redis rate limiter');
        return new RedisRateLimiter(redisUrl);
    } else {
        console.warn('⚠️  Using in-memory rate limiter (development only)');
        return new MemoryRateLimiter();
    }
}
```

#### Step 3: Update hooks.server.js

```javascript
// src/hooks.server.js

import { createRateLimiter } from '$lib/server/rate-limiter.js';

// Initialize rate limiter
const rateLimiter = createRateLimiter();

// In handle function:
export const handle = async ({ event, resolve }) => {
    // ... existing code ...

    // Rate limiting with distributed store
    const { allowed, remaining, resetTime } = await rateLimiter.checkLimit(
        rateLimitKey,
        rateLimitConfig.maxRequests,
        rateLimitConfig.windowMs
    );

    if (!allowed) {
        return new Response('Too Many Requests', {
            status: 429,
            headers: {
                'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
                'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000))
            }
        });
    }

    // ... rest of handler ...
};

// Cleanup on shutdown
if (typeof process !== 'undefined') {
    process.on('SIGTERM', async () => {
        await rateLimiter.close();
    });
}
```

---

## 3. File Upload Security

### Problem
File size validation happens after reading entire file into memory.

### Solution: Streaming Validation with Content-Length Check

#### Step 1: Update svelte.config.js

```javascript
// svelte.config.js

import adapter from '@sveltejs/adapter-node';

export default {
    kit: {
        adapter: adapter({
            // Enforce body size limit at adapter level
            bodyParser: {
                sizeLimit: '5mb'  // Reject before memory allocation
            }
        })
    }
};
```

#### Step 2: Add Content-Length Middleware

```javascript
// src/lib/server/upload-middleware.js

/**
 * File upload security middleware
 * Validates size before processing
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_BATCH_SIZE = 10 * 1024 * 1024; // 10MB for batch uploads

/**
 * Validate request size before processing
 * @param {Request} request
 * @param {number} maxSize
 * @returns {{valid: boolean, error?: string}}
 */
export function validateRequestSize(request, maxSize = MAX_FILE_SIZE) {
    const contentLength = request.headers.get('content-length');

    if (!contentLength) {
        return {
            valid: false,
            error: 'Content-Length header required for uploads'
        };
    }

    const size = parseInt(contentLength, 10);

    if (isNaN(size)) {
        return {
            valid: false,
            error: 'Invalid Content-Length header'
        };
    }

    if (size > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${Math.floor(maxSize / 1024 / 1024)}MB`
        };
    }

    return { valid: true };
}

/**
 * Stream file with size tracking
 * Aborts if size exceeds limit during streaming
 */
export async function readFileWithSizeLimit(file, maxSize) {
    const reader = file.stream().getReader();
    const chunks = [];
    let totalSize = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            totalSize += value.length;

            if (totalSize > maxSize) {
                reader.cancel();
                throw new Error(`File exceeds maximum size of ${Math.floor(maxSize / 1024 / 1024)}MB`);
            }

            chunks.push(value);
        }

        // Combine chunks into single buffer
        const combined = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }

        return new TextDecoder().decode(combined);
    } catch (error) {
        reader.cancel();
        throw error;
    }
}
```

#### Step 3: Update Share Target Endpoint

```javascript
// src/routes/api/share-target/+server.js

import { validateRequestSize, readFileWithSizeLimit } from '$lib/server/upload-middleware.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST({ request }) {
    try {
        // SECURITY: Validate size before reading body
        const sizeValidation = validateRequestSize(request, MAX_FILE_SIZE);
        if (!sizeValidation.valid) {
            return new Response(sizeValidation.error, { status: 413 });
        }

        // Parse multipart/form-data
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return redirect(303, '/?error=no_file&source=share');
        }

        // SECURITY: Stream read with size validation
        let fileText;
        try {
            fileText = await readFileWithSizeLimit(file, MAX_FILE_SIZE);
        } catch (error) {
            console.error('File read error:', error);
            return redirect(303, `/?error=${encodeURIComponent(error.message)}&source=share`);
        }

        // Continue with existing validation...
        const fileValidation = validateFile(file);
        if (!fileValidation.valid) {
            const error = encodeURIComponent(fileValidation.error);
            return redirect(303, `/?error=${error}&source=share`);
        }

        // ... rest of handler ...
    } catch (error) {
        console.error('Share target error:', error);
        return redirect(303, '/?error=upload_failed&source=share');
    }
}
```

#### Step 4: Add Upload Rate Limiting

```javascript
// src/hooks.server.js - Add file upload specific rate limiting

const RATE_LIMITS = {
    search: { maxRequests: 30, windowMs: 60 * 1000 },
    api: { maxRequests: 100, windowMs: 60 * 1000 },
    page: { maxRequests: 200, windowMs: 60 * 1000 },
    fileUpload: { maxRequests: 5, windowMs: 60 * 60 * 1000 }  // 5 uploads per hour
};

// In handle function:
if (pathname === '/api/share-target') {
    rateLimitConfig = RATE_LIMITS.fileUpload;
    rateLimitKey = `${clientIP}:upload`;
}
```

---

## 4. CSP Nonce Usage

### Problem
CSP nonces generated but not applied to inline scripts in components.

### Solution: Pass Nonces to Components

#### Step 1: Expose Nonce in Root Layout

```javascript
// src/routes/+layout.server.js

export function load({ locals }) {
    return {
        csrfToken: locals.csrfToken,
        cspNonce: locals.cspNonce  // Make available to all pages
    };
}
```

#### Step 2: Use Nonce in Components

```svelte
<!-- src/routes/+layout.svelte -->
<script>
    export let data;

    // CSP nonce available for dynamic script injection
    const cspNonce = data.cspNonce;
</script>

<!-- If you need inline scripts (avoid if possible) -->
{#if cspNonce}
    <script nonce={cspNonce}>
        // Inline script with nonce
        console.log('Script with CSP nonce');
    </script>
{/if}
```

#### Step 3: Use Nonce for Dynamic Script Injection

```javascript
// src/lib/utils/script-loader.js

/**
 * Safely inject script with CSP nonce
 * @param {string} src - Script source URL
 * @param {string} nonce - CSP nonce from server
 * @returns {Promise<void>}
 */
export function loadScriptWithNonce(src, nonce) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.nonce = nonce;  // Apply CSP nonce
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}
```

---

## 5. Secure Error Handling

### Problem
Error messages may leak stack traces if NODE_ENV misconfigured.

### Solution: Fail-Secure Error Handling

#### Create Secure Error Handler

```javascript
// src/lib/server/error-handler.js

/**
 * Secure error response builder
 * Sanitizes errors based on environment with fail-secure defaults
 */

/**
 * Check if running in production (fail-secure)
 * @returns {boolean}
 */
function isProduction() {
    // Explicitly check for production
    const nodeEnv = process.env.NODE_ENV;

    // Fail-secure: If NODE_ENV is undefined or not 'development', treat as production
    return nodeEnv !== 'development';
}

/**
 * Sanitize error for client response
 * @param {Error | AppError} error
 * @returns {{error: string, message: string, statusCode: number}}
 */
export function sanitizeError(error) {
    const isProd = isProduction();

    // Structured error (AppError, ApiError, etc.)
    if (error.code && error.statusCode) {
        return {
            error: error.code,
            message: isProd ? getGenericMessage(error.code) : error.message,
            statusCode: error.statusCode
        };
    }

    // Generic Error
    return {
        error: 'INTERNAL_ERROR',
        message: isProd ? 'An error occurred' : error.message,
        statusCode: 500
    };
}

/**
 * Get generic error message for production
 * @param {string} code - Error code
 * @returns {string}
 */
function getGenericMessage(code) {
    const messages = {
        'UNAUTHORIZED': 'Authentication required',
        'FORBIDDEN': 'Access denied',
        'VALIDATION_ERROR': 'Invalid request data',
        'NOT_FOUND': 'Resource not found',
        'RATE_LIMITED': 'Too many requests',
        'DATABASE_ERROR': 'Database operation failed',
        'INTERNAL_ERROR': 'Internal server error'
    };

    return messages[code] || 'An error occurred';
}

/**
 * Log error with context (always log full details)
 * @param {Error} error
 * @param {object} context
 */
export function logError(error, context = {}) {
    const errorDetails = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        ...context
    };

    console.error('Error:', JSON.stringify(errorDetails, null, 2));

    // TODO: Send to error tracking service (Sentry, etc.)
}

/**
 * Create JSON error response
 * @param {Error} error
 * @param {object} context - Additional logging context
 * @returns {Response}
 */
export function createErrorResponse(error, context = {}) {
    // Log full error details server-side
    logError(error, context);

    // Return sanitized error to client
    const sanitized = sanitizeError(error);

    return new Response(
        JSON.stringify(sanitized),
        {
            status: sanitized.statusCode,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}
```

#### Update API Endpoints

```javascript
// Example: src/routes/api/push-send/+server.js

import { createErrorResponse } from '$lib/server/error-handler.js';

export async function POST({ request, locals }) {
    try {
        // ... handler logic ...
    } catch (error) {
        // Secure error handling with context
        return createErrorResponse(error, {
            endpoint: '/api/push-send',
            method: 'POST',
            ip: request.headers.get('x-forwarded-for'),
            timestamp: Date.now()
        });
    }
}
```

---

## 6. Security Testing Patterns

### SQL Injection Testing

```javascript
// tests/security-sql-injection.test.js

import { describe, it, expect } from 'vitest';
import { upsertSubscription, getSubscriptionByEndpoint } from '$lib/db/server/push-subscriptions';

describe('SQL Injection Protection', () => {
    it('should escape SQL injection in endpoint field', () => {
        const maliciousEndpoint = "https://example.com'; DROP TABLE push_subscriptions; --";

        // Should not cause SQL injection
        const result = upsertSubscription({
            endpoint: maliciousEndpoint,
            authKey: 'test-auth',
            p256dhKey: 'test-p256dh'
        });

        expect(result).toBeDefined();
        expect(result.endpoint).toBe(maliciousEndpoint);

        // Table should still exist
        const retrieved = getSubscriptionByEndpoint(maliciousEndpoint);
        expect(retrieved).toBeDefined();
    });

    it('should handle SQL wildcards in WHERE clause', () => {
        const endpoint = 'https://example.com/%';

        upsertSubscription({
            endpoint,
            authKey: 'test',
            p256dhKey: 'test'
        });

        // Should match exact endpoint, not wildcard
        const result = getSubscriptionByEndpoint(endpoint);
        expect(result?.endpoint).toBe(endpoint);
    });
});
```

### XSS Testing

```javascript
// tests/security-xss.test.js

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeHtml, sanitizeUrl } from '$lib/security/sanitize';

describe('XSS Protection', () => {
    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<svg onload=alert("XSS")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<SCRIPT SRC=http://xss.rocks/xss.js></SCRIPT>'
    ];

    it('should escape all XSS payloads', () => {
        xssPayloads.forEach(payload => {
            const escaped = escapeHtml(payload);
            expect(escaped).not.toContain('<script');
            expect(escaped).not.toContain('onerror=');
            expect(escaped).not.toContain('javascript:');
        });
    });

    it('should sanitize HTML and remove dangerous tags', () => {
        xssPayloads.forEach(payload => {
            const sanitized = sanitizeHtml(payload);
            expect(sanitized).not.toContain('<script');
            expect(sanitized).not.toContain('<iframe');
            expect(sanitized).not.toContain('onerror');
        });
    });

    it('should block dangerous protocols in URLs', () => {
        const dangerousUrls = [
            'javascript:alert("XSS")',
            'data:text/html,<script>alert("XSS")</script>',
            'vbscript:msgbox("XSS")',
            'file:///etc/passwd'
        ];

        dangerousUrls.forEach(url => {
            const sanitized = sanitizeUrl(url);
            expect(sanitized).toBe('');
        });
    });
});
```

### Rate Limiting Testing

```javascript
// tests/security-rate-limiting.test.js

import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '$lib/server/rate-limiter';

describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
        const limiter = createRateLimiter();
        const key = 'test:endpoint';
        const maxRequests = 5;
        const windowMs = 1000;

        // Make maxRequests requests - should all succeed
        for (let i = 0; i < maxRequests; i++) {
            const result = await limiter.checkLimit(key, maxRequests, windowMs);
            expect(result.allowed).toBe(true);
        }

        // Next request should be rate limited
        const blocked = await limiter.checkLimit(key, maxRequests, windowMs);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
    });

    it('should handle concurrent requests correctly', async () => {
        const limiter = createRateLimiter();
        const key = 'test:concurrent';
        const maxRequests = 10;

        // Make 20 concurrent requests
        const promises = Array.from({ length: 20 }, () =>
            limiter.checkLimit(key, maxRequests, 60000)
        );

        const results = await Promise.all(promises);
        const allowed = results.filter(r => r.allowed).length;

        // Should allow exactly maxRequests
        expect(allowed).toBe(maxRequests);
    });
});
```

---

## Security Checklist Template

Use this checklist when implementing new features:

```markdown
## Security Implementation Checklist

### Input Validation
- [ ] All user input validated with type guards
- [ ] String inputs have length limits
- [ ] URLs validated against allowlist protocols
- [ ] File uploads have size and type restrictions
- [ ] SQL queries use parameterized statements

### Output Encoding
- [ ] HTML output properly escaped
- [ ] JSON responses use `json()` helper
- [ ] URLs sanitized before rendering
- [ ] Error messages don't leak sensitive data

### Authentication & Authorization
- [ ] Endpoints require authentication where needed
- [ ] JWT tokens have expiration
- [ ] CSRF protection on state-changing endpoints
- [ ] Authorization checks before data access

### Rate Limiting
- [ ] Endpoint has appropriate rate limit
- [ ] Expensive operations have stricter limits
- [ ] Rate limit headers included in response

### Security Headers
- [ ] CSP configured for new resources
- [ ] CORS headers restrictive (no wildcard)
- [ ] Content-Type set correctly

### Error Handling
- [ ] Errors logged with context
- [ ] Production errors sanitized
- [ ] Stack traces never sent to client

### Testing
- [ ] Security tests written
- [ ] XSS payloads tested
- [ ] SQL injection tested (if applicable)
- [ ] Rate limiting tested
```

---

## Quick Reference Commands

```bash
# Generate JWT secret
openssl rand -base64 64

# Generate VAPID keys
npx web-push generate-vapid-keys

# Rotate JWT secret
npm run rotate:jwt-secret

# Run security tests
npm test security-csrf.test.js
npm test security-jwt.test.js

# Check for vulnerabilities
npm audit
npm audit fix

# Scan for secrets in code
git grep -i "api.*key.*=" | grep -v "process.env"

# Monitor production logs
tail -f logs/error.log | grep -E "(Unauthorized|Rate|CSRF)"
```

---

## Additional Resources

- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org/
- **SvelteKit Security**: https://kit.svelte.dev/docs/security
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **Redis Rate Limiting**: https://redis.io/topics/
- **JWT Best Practices**: https://tools.ietf.org/html/rfc8725

---

**Last Updated**: 2026-01-26
**Maintainer**: Security Team
**Questions**: security@dmbalmanac.com
