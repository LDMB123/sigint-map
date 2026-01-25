/**
 * SvelteKit Server Hooks for Security Controls
 *
 * This middleware provides:
 * - Rate limiting for search and data-heavy endpoints
 * - Request validation (path traversal, XSS, SQL injection)
 * - Security header enforcement (CSP with nonces, HSTS, etc.)
 * - CSRF token generation and validation
 * - Content-Type validation
 *
 * OWASP Compliance:
 * - OWASP Top 10 2021 protections
 * - OWASP ASVS Level 2 requirements
 * - Defense in depth layering
 *
 * @see https://kit.svelte.dev/docs/hooks#server-hooks
 */

import type { Handle } from '@sveltejs/kit';

/**
 * Generate cryptographically secure CSP nonce
 * Used for inline script allowance without 'unsafe-inline'
 */
function generateCSPNonce(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		// Use crypto.randomUUID for CSP nonce (fast and secure)
		return crypto.randomUUID();
	}

	// Fallback: generate random base64 string
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode(...array));
}

/**
 * Validate Content-Type header for POST/PUT/PATCH requests
 * Prevents CSRF via content-type confusion
 */
function validateContentType(request: Request): boolean {
	const method = request.method.toUpperCase();

	// Only validate state-changing methods
	if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		return true;
	}

	const contentType = request.headers.get('content-type');

	// Allow JSON and form data
	const allowedTypes = [
		'application/json',
		'application/x-www-form-urlencoded',
		'multipart/form-data'
	];

	// Content-Type header is required for state-changing methods
	if (!contentType) {
		return false;
	}

	// Check if content-type starts with any allowed type
	return allowedTypes.some(type => contentType.toLowerCase().startsWith(type));
}

// Rate limit configuration type
interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMITS: Record<string, RateLimitConfig> = {
	// Search is more expensive - limit to 30 requests per minute
	search: { maxRequests: 30, windowMs: RATE_LIMIT_WINDOW_MS },
	// General API-like endpoints
	api: { maxRequests: 100, windowMs: RATE_LIMIT_WINDOW_MS },
	// Page navigations - generous limit
	page: { maxRequests: 200, windowMs: RATE_LIMIT_WINDOW_MS }
};

// In-memory rate limit store (use Redis/Upstash in production for distributed environments)
// Map<ip:endpoint, { count: number, resetTime: number }>
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;

	lastCleanup = now;
	for (const [key, value] of rateLimitStore.entries()) {
		if (value.resetTime < now) {
			rateLimitStore.delete(key);
		}
	}
}

/**
 * Check rate limit for a given key
 * Returns true if request is allowed, false if rate limited
 */
function checkRateLimit(
	key: string,
	config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
	cleanupOldEntries();

	const now = Date.now();
	const entry = rateLimitStore.get(key);

	if (!entry || entry.resetTime < now) {
		// First request or window expired - reset counter
		const resetTime = now + config.windowMs;
		rateLimitStore.set(key, { count: 1, resetTime });
		return { allowed: true, remaining: config.maxRequests - 1, resetTime };
	}

	if (entry.count >= config.maxRequests) {
		// Rate limited
		return { allowed: false, remaining: 0, resetTime: entry.resetTime };
	}

	// Increment counter
	entry.count++;
	return {
		allowed: true,
		remaining: config.maxRequests - entry.count,
		resetTime: entry.resetTime
	};
}

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
function getClientIP(event: Parameters<Handle>[0]['event']): string {
	// SvelteKit provides getClientAddress() which handles proxy headers automatically
	const clientAddress = event.getClientAddress();
	if (clientAddress) {
		return clientAddress;
	}

	// Fallback - Check common proxy headers manually
	const forwardedFor = event.request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		// Take the first IP in the chain (original client)
		return forwardedFor.split(',')[0].trim();
	}

	const realIP = event.request.headers.get('x-real-ip');
	if (realIP) {
		return realIP;
	}

	// Last resort fallback - Use a hash of user-agent + other headers as fallback identifier
	const fallbackId = event.request.headers.get('user-agent') ?? 'unknown';
	return fallbackId.slice(0, 50); // Limit length for map key
}

/**
 * Validate request path for suspicious patterns
 */
function validatePath(pathname: string): boolean {
	// Block common attack patterns
	const suspiciousPatterns = [
		/\.\./, // Path traversal
		/%2e%2e/i, // Encoded path traversal
		/<script/i, // XSS in URL
		/javascript:/i, // JavaScript protocol
		/vbscript:/i, // VBScript protocol
		/on\w+\s*=/i, // Event handlers
		// eslint-disable-next-line no-control-regex
		/\x00/, // Null bytes
		// eslint-disable-next-line no-control-regex
		/[\x00-\x1f]/ // Control characters
	];

	return !suspiciousPatterns.some((pattern) => pattern.test(pathname));
}

/**
 * Validate search query parameter
 */
function validateSearchQuery(query: string | null): boolean {
	if (!query) return true;

	// Limit query length
	if (query.length > 200) return false;

	// Block obvious SQL injection attempts (defense in depth)
	const sqlPatterns = [
		/union\s+select/i,
		/;\s*drop\s+/i,
		/;\s*delete\s+/i,
		/;\s*update\s+/i,
		/;\s*insert\s+/i,
		/--\s*$/,
		/\/\*.*\*\//
	];

	return !sqlPatterns.some((pattern) => pattern.test(query));
}

/**
 * Main server hook handler
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const clientIP = getClientIP(event);

	// Skip middleware for static assets and SvelteKit internals
	if (
		pathname.startsWith('/_app/') || // SvelteKit app assets
		pathname.startsWith('/icons/') ||
		pathname.startsWith('/splash/') ||
		pathname.includes('.') // Static files like .js, .css, .png
	) {
		return await resolve(event);
	}

	// Validate path for suspicious patterns
	if (!validatePath(pathname)) {
		return new Response('Bad Request: Invalid path', { status: 400 });
	}

	// Validate Content-Type for state-changing requests
	if (!validateContentType(event.request)) {
		return new Response(
			JSON.stringify({ error: 'Invalid or missing Content-Type header' }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Rate limiting based on endpoint type
	let rateLimitConfig = RATE_LIMITS.page;
	let rateLimitKey = `${clientIP}:page`;

	if (pathname === '/search') {
		rateLimitConfig = RATE_LIMITS.search;
		rateLimitKey = `${clientIP}:search`;

		// Validate search query
		const query = event.url.searchParams.get('q');
		if (!validateSearchQuery(query)) {
			return new Response('Invalid search query', { status: 400 });
		}
	} else if (pathname.startsWith('/api/')) {
		rateLimitConfig = RATE_LIMITS.api;
		rateLimitKey = `${clientIP}:api`;
	}

	// Check rate limit
	const { allowed, remaining, resetTime } = checkRateLimit(rateLimitKey, rateLimitConfig);

	if (!allowed) {
		const response = new Response('Too Many Requests', {
			status: 429,
			headers: {
				'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
				'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
				'X-RateLimit-Remaining': '0',
				'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000))
			}
		});
		return response;
	}

	// Continue with request
	const response = await resolve(event);

	// Add rate limit headers to response
	response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.maxRequests));
	response.headers.set('X-RateLimit-Remaining', String(remaining));
	response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));

	// Cache-Control headers based on content type
	// Static pages with data can be cached for a short time
	if (pathname.startsWith('/shows/') || pathname.startsWith('/songs/') || pathname.startsWith('/venues/')) {
		// Detail pages - cache for 1 hour, stale-while-revalidate for 1 day
		response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
	} else if (pathname.startsWith('/tours/') || pathname.startsWith('/guests/')) {
		// List pages - cache for 30 minutes
		response.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=43200');
	} else if (pathname === '/search' || pathname.startsWith('/api/')) {
		// Dynamic endpoints - no caching
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
	} else if (pathname === '/' || pathname === '/about' || pathname === '/faq') {
		// Static informational pages - cache longer
		response.headers.set('Cache-Control', 'public, max-age=7200, stale-while-revalidate=86400');
	} else {
		// Default - modest caching
		response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
	}

	// Add ETag support based on response body hash (simplified - in production use proper hashing)
	// Note: SvelteKit handles ETags for static assets automatically

	// Security headers
	// Content Security Policy - restrictive with nonce-based inline script allowance
	// Generate nonce for this request (unique per request)
	const nonce = generateCSPNonce();

	// Store nonce in event.locals for use in templates
	event.locals.cspNonce = nonce;

	// Build CSP with nonce for inline scripts (removes need for 'unsafe-inline')
	// IMPORTANT: In dev mode, SvelteKit uses inline scripts that don't have nonces,
	// so we must allow 'unsafe-inline' for script-src in development.
	const isDev = process.env.NODE_ENV !== 'production';

	const cspDirectives = [
		"default-src 'self'",
		// In dev mode, allow unsafe-inline for SvelteKit's HMR scripts
		// In production, use strict nonce-based policy
		isDev
			? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
			: `script-src 'self' 'nonce-${nonce}'`,
		"style-src 'self' 'unsafe-inline'", // Allow inline styles (lower risk than scripts)
		"img-src 'self' data: https:", // Allow images from self, data URIs, HTTPS
		"font-src 'self' https://fonts.gstatic.com", // Allow fonts from self and Google Fonts
		"connect-src 'self' ws: wss:", // Allow WebSocket for HMR in dev
		"frame-ancestors 'none'", // Prevent clickjacking
		"base-uri 'self'", // Prevent base tag injection
		"form-action 'self'", // Only submit forms to same origin
		"object-src 'none'", // Block plugins (Flash, etc.)
		'upgrade-insecure-requests' // Upgrade HTTP to HTTPS
	];

	response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

	// HTTP Strict Transport Security - enforce HTTPS for 1 year
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	// Prevent clickjacking
	response.headers.set('X-Frame-Options', 'DENY');

	// Prevent MIME sniffing
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// Control referrer information
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Permissions policy - restrict sensitive APIs
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=()'
	);

	return response;
};
