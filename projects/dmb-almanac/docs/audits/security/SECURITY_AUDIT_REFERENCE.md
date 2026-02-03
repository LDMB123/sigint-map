# Security Audit Reference - DMB Almanac

## Overall Rating: MEDIUM | Maturity: LEVEL 3 (ADVANCED)

## Findings Summary

### MEDIUM Severity

- **MEDIUM-01**: JWT secret has no rotation mechanism
  - Location: `/src/routes/api/push-send/+server.js:120`
  - Legacy API key fallback still active
  - Compromised secret = indefinite unauthorized push access
  - Fix: multi-secret JWT verification with 7-day grace period, 90-day rotation schedule

- **MEDIUM-02**: In-memory rate limit store exhaustion risk
  - Location: `/src/hooks.server.js:122-175`
  - 5000-entry cap, 30s cleanup interval
  - IP rotation attacks can fill store, evict entries via LRU
  - Fix: Redis/Upstash in production, threshold-triggered cleanup at 90% capacity

- **MEDIUM-03**: File upload size validated after memory allocation
  - Location: `/src/routes/api/share-target/+server.js:28-61`
  - 100 concurrent 10MB uploads = 1GB memory consumption
  - Fix: Content-Length pre-check, streaming validation, 5MB adapter body limit

### LOW Severity

- **LOW-01**: `cookie` package CVE-2024-47764 (out-of-bounds chars in names/paths)
  - No dynamic cookie names from user input, risk minimal
  - Monitor for SvelteKit update, set up Dependabot

- **LOW-02**: CSP nonces generated but not applied to inline scripts
  - `event.locals.cspNonce` set, `nonce-${nonce}` in CSP header
  - Nonces not observed in Svelte component templates
  - Fix: expose via `+layout.server.js`, apply `nonce={cspNonce}` to inline scripts

- **LOW-03**: HTTPS redirect allows localhost regardless of NODE_ENV
  - Fix: gate localhost exemption on `NODE_ENV === 'development'`

- **LOW-04**: SQL `UPDATE` uses string concatenation for field names
  - Location: `/src/lib/db/server/push-subscriptions.js:214-218`
  - Field names hardcoded (safe), values parameterized
  - Fix: add `ALLOWED_FIELDS` Set whitelist for defense-in-depth

- **LOW-05**: Error messages may leak stack traces if NODE_ENV unset
  - Fix: fail-secure -- treat anything except `development` as production

## Security Controls (Working)

- CSRF: double-submit cookie, constant-time comparison, SameSite=Strict
- CSP: `default-src 'self'`, no `unsafe-inline` in production, `frame-ancestors 'none'`
- Input validation: type guards, length limits, URL protocol allowlist, base64url/UUID validation
- HTML sanitization: whitelist-based tags, all attributes stripped, URL sanitization
- JWT: HMAC-SHA256, constant-time signature comparison, expiration enforcement
- Database: parameterized queries throughout, WAL mode
- Rate limiting: sliding window, per-endpoint configs, IP extraction with proxy headers
- Security headers: HSTS (1yr), X-Frame-Options DENY, nosniff, strict referrer
- Path traversal: blocks `../`, encoded traversal, null bytes, control chars
- Service Worker: no eval, versioned caches, network-first for API routes

## JWT Key Rotation Implementation

- Env vars: `JWT_SECRET_CURRENT`, `JWT_SECRET_PREVIOUS`, `JWT_SECRET_ROTATION_DATE`
- `getActiveSecrets()`: returns current + previous (if within 7-day grace period)
- `getSigningSecret()`: always returns current
- `needsRotation()`: checks if >90 days since last rotation
- Verification: try all active secrets sequentially
- Rotation script: manual process -- `openssl rand -base64 64` to generate, then update env vars

## Rate Limiting Implementation

- Redis `RedisRateLimiter`: sliding window via sorted sets, pipeline for atomic ops, fail-open on Redis error
- Memory `MemoryRateLimiter`: fixed window, 5000-entry cap (dev only)
- Factory: `createRateLimiter()` -- Redis in production, memory in dev
- Rate limit configs:
  - Search: 30 req/min
  - API: 100 req/min
  - Page: 200 req/min
  - File upload: 5 req/hour

## File Upload Security

- `validateRequestSize()`: Content-Length pre-check before body read
- `readFileWithSizeLimit()`: streaming read with cumulative size tracking, abort on exceed
- SvelteKit adapter: `bodyParser.sizeLimit: '5mb'`
- Share target: 5MB per file, multipart/form-data

## Error Handling Pattern

- `sanitizeError()`: fail-secure, `NODE_ENV !== 'development'` treated as production
- Generic messages by error code in production
- `logError()`: full stack trace server-side always
- `createErrorResponse()`: logs full details, returns sanitized response

## Security Test Patterns

- SQL injection: test malicious endpoints, SQL wildcards in WHERE
- XSS: 7 payload vectors including script tags, event handlers, protocol vectors
- Rate limiting: enforce limits, concurrent request correctness
- Test files: `security-csrf.test.js` (100+ tests), `security-jwt.test.js` (60+ tests)

## OWASP Top 10 2021 Coverage

- A01 Broken Access Control: PROTECTED (JWT, CSRF, rate limiting)
- A02 Cryptographic Failures: PROTECTED (HTTPS, HSTS, secure cookies)
- A03 Injection: PROTECTED (parameterized queries, input validation, sanitization)
- A04 Insecure Design: PROTECTED (defense-in-depth, fail-secure)
- A05 Security Misconfiguration: PARTIAL (CSP nonces not fully utilized)
- A06 Vulnerable Components: PARTIAL (1 LOW dep vuln)
- A07 Auth Failures: PROTECTED
- A08 Data Integrity: PROTECTED (no CDN deps)
- A09 Logging Failures: PROTECTED
- A10 SSRF: PROTECTED (URL allowlist)

## Immediate Actions

- [ ] Rotate VAPID keys and JWT secrets from defaults
- [ ] Verify no secrets in git history: `git log -S "VAPID_PRIVATE_KEY"`
- [ ] Update SvelteKit (fixes cookie vuln)
- [ ] Set up Dependabot
- [ ] Implement Redis rate limiting for production
- [ ] Remove legacy API key fallback (deadline: 2026-02-26)

## Quick Commands

```bash
openssl rand -base64 64              # Generate JWT secret
npx web-push generate-vapid-keys     # Generate VAPID keys
# Rotate JWT: update JWT_SECRET_CURRENT/PREVIOUS env vars manually
npm audit                            # Check vulnerabilities
git grep -i "api.*key.*=" | grep -v "process.env"  # Scan for secrets
```

## Deployment Checklist

- [ ] `NODE_ENV=production` set
- [ ] All secrets rotated from defaults
- [ ] HTTPS enforced, HSTS enabled
- [ ] CSP configured, no unsafe-inline
- [ ] Rate limiting on distributed store
- [ ] Error messages sanitized
- [ ] `npm audit` clean
- [ ] File upload limits at infrastructure level
