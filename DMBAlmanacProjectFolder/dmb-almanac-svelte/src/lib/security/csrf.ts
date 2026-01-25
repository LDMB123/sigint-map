/**
 * CSRF Protection Implementation
 *
 * Provides double-submit cookie pattern for CSRF protection
 * Compliant with OWASP CSRF Prevention Cheat Sheet
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 *
 * Implementation Details:
 * - Uses cryptographically secure random tokens
 * - Double-submit cookie pattern (no server state required)
 * - Tokens expire after 1 hour
 * - Automatic token rotation
 * - SameSite=Strict cookie attribute
 */

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'csrf_token';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CSRFToken {
  token: string;
  expiresAt: number;
}

let currentToken: CSRFToken | null = null;

/**
 * Generate cryptographically secure random token
 * Uses Web Crypto API for true randomness
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token
 * Returns existing token if valid, creates new one if expired
 */
export function getCSRFToken(): string {
  const now = Date.now();

  // Return existing token if still valid
  if (currentToken && currentToken.expiresAt > now) {
    return currentToken.token;
  }

  // Generate new token
  const token = generateSecureToken();
  const expiresAt = now + TOKEN_EXPIRY_MS;

  currentToken = { token, expiresAt };

  // Set cookie with security flags
  setCsrfCookie(token, expiresAt);

  return token;
}

/**
 * Set CSRF token cookie with security flags
 */
function setCsrfCookie(token: string, expiresAt: number): void {
  if (typeof document === 'undefined') {
    return; // Server-side rendering
  }

  const expires = new Date(expiresAt).toUTCString();
  const cookieValue = `${CSRF_TOKEN_COOKIE}=${token}; expires=${expires}; path=/; SameSite=Strict; Secure`;

  document.cookie = cookieValue;
}

/**
 * Get CSRF token from cookie
 */
function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_TOKEN_COOKIE) {
      return value;
    }
  }

  return null;
}

/**
 * Validate CSRF token from request
 * Compares header token with cookie token (double-submit pattern)
 *
 * Server-side usage:
 * const isValid = validateCSRFToken(request.headers.get('X-CSRF-Token'), request.headers.get('Cookie'))
 */
export function validateCSRFToken(headerToken: string | null, cookieHeader: string | null): boolean {
  if (!headerToken || !cookieHeader) {
    return false;
  }

  // Extract token from cookie header
  const cookies = cookieHeader.split(';');
  let cookieToken: string | null = null;

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_TOKEN_COOKIE) {
      cookieToken = value;
      break;
    }
  }

  if (!cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Add CSRF token to fetch request headers
 *
 * Usage:
 * const response = await fetch('/api/endpoint', addCSRFHeader({
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * }))
 */
export function addCSRFHeader(init: RequestInit = {}): RequestInit {
  const token = getCSRFToken();
  const headers = new Headers(init.headers);
  headers.set(CSRF_TOKEN_HEADER, token);

  return {
    ...init,
    headers,
    credentials: 'same-origin', // Include cookies
  };
}

/**
 * Wrapper around fetch that automatically includes CSRF token
 *
 * Usage:
 * const response = await secureFetch('/api/endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * })
 */
export async function secureFetch(url: string, init: RequestInit = {}): Promise<Response> {
  // Only add CSRF token for state-changing methods
  const method = init.method?.toUpperCase() || 'GET';
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (needsCSRF) {
    return fetch(url, addCSRFHeader(init));
  }

  return fetch(url, init);
}

/**
 * Rotate CSRF token (create new token)
 * Should be called after successful authentication
 */
export function rotateCSRFToken(): string {
  currentToken = null;
  return getCSRFToken();
}

/**
 * Clear CSRF token and cookie
 * Should be called on logout
 */
export function clearCSRFToken(): void {
  currentToken = null;

  if (typeof document !== 'undefined') {
    document.cookie = `${CSRF_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure`;
  }
}

/**
 * Server-side CSRF validation middleware
 * Use in +server.ts files for API routes
 *
 * Example usage in +server.ts:
 * ```
 * import { validateCSRF } from '$lib/security/csrf';
 *
 * export const POST: RequestHandler = async ({ request }) => {
 *   const csrfError = validateCSRF(request);
 *   if (csrfError) {
 *     return csrfError;
 *   }
 *
 *   // Process request...
 * }
 * ```
 */
export function validateCSRF(request: Request): Response | null {
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  const cookieHeader = request.headers.get('Cookie');

  if (!validateCSRFToken(headerToken, cookieHeader)) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing CSRF token' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;
}

export { CSRF_TOKEN_HEADER, CSRF_TOKEN_COOKIE };
