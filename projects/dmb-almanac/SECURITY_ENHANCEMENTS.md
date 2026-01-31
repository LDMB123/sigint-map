# Security Enhancements Implementation Guide

## HIGH-SEC-001: Stack Trace Sanitization
## HIGH-SEC-002: PII Detection and Redaction

### Overview

This document describes the security enhancements needed for `app/src/lib/errors/logger.js` to fix two high-severity vulnerabilities:

1. **HIGH-SEC-001**: Stack traces may leak internal paths/structure
2. **HIGH-SEC-002**: Error messages may contain unredacted PII in edge cases

### Implementation Required

#### 1. Add PII Patterns and Redaction Level (after line 34)

```javascript
let _redactionLevel = 'standard'; // 'minimal', 'standard', 'strict'

// Add to SENSITIVE_KEYS array:
	'email', 'phone', 'phoneNumber', 'phone_number',
	'address', 'ip', 'ipAddress', 'ip_address'

// PII patterns for content scanning (HIGH-SEC-002)
const PII_PATTERNS = {
	// Email addresses
	email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
	// Phone numbers (US and international formats)
	phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
	// IPv4 addresses
	ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
	// IPv6 addresses
	ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
	// URLs with tokens
	urlWithToken: /https?:\/\/[^\s]*[?&](token|key|secret|auth|api_key|apikey|access_token)=[^\s&]*/gi,
	// API keys
	apiKey: /\b(?:sk|pk|api)[-_]?[a-z0-9]{32,}\b/gi,
	// JWT tokens
	jwt: /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/g,
	// Credit cards
	creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
	// SSN
	ssn: /\b\d{3}-\d{2}-\d{4}\b/g
};
```

#### 2. Add Stack Trace Sanitization Function (after session ID generation)

```javascript
/**
 * Get project root path for stack trace sanitization
 * @private
 * @returns {string} Project root path
 */
function getProjectRoot() {
	if (typeof window !== 'undefined' && window.location) {
		return window.location.origin;
	}
	if (typeof process !== 'undefined' && process.cwd) {
		return process.cwd();
	}
	return '/Users/';
}

/**
 * Sanitize stack trace - Remove absolute paths, keep relative (HIGH-SEC-001)
 * @private
 * @param {string} stack - Stack trace string
 * @returns {string} Sanitized stack trace
 */
function sanitizeStackTrace(stack) {
	if (!stack || typeof stack !== 'string') return '';

	// In production, remove all paths for maximum security
	if (!isDev) {
		return stack
			.replace(/(?:file:\/\/|webpack:\/\/)?[/\\].*?[/\\]([^/\\:]+):(\d+):(\d+)/g, '$1:$2:$3')
			.replace(/\s+at\s+.*?[/\\]([^/\\:]+):(\d+):(\d+)/g, ' at $1:$2:$3')
			.replace(/\/Users\/[^/]+\//g, '')
			.replace(/\/home\/[^/]+\//g, '')
			.replace(/C:\\Users\\[^\\]+\\/g, '')
			.replace(/\/var\/[^/]+\//g, '')
			.replace(/file:\/\//g, '');
	}

	// In development, convert absolute to relative paths
	const projectRoot = getProjectRoot();
	return stack
		.replace(new RegExp(projectRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.')
		.replace(/\\/g, '/')
		.replace(/\/Users\/[^/]+\//g, '~/')
		.replace(/\/home\/[^/]+\//g, '~/')
		.replace(/C:\\Users\\[^\\]+\\/g, '~/')
		.replace(/file:\/\/.*?\/([^/]+\/[^:]+)/g, '$1');
}
```

#### 3. Add PII Redaction Function

```javascript
/**
 * Redact PII from text content (HIGH-SEC-002)
 * @private
 * @param {string} text - Text to scan and redact
 * @param {'minimal' | 'standard' | 'strict'} level - Redaction level
 * @returns {string} Redacted text
 */
function redactPII(text, level = 'standard') {
	if (!text || typeof text !== 'string') return text;

	let redacted = text;

	// Minimal - only secrets
	if (level === 'minimal') {
		redacted = redacted
			.replace(PII_PATTERNS.apiKey, '[API_KEY_REDACTED]')
			.replace(PII_PATTERNS.jwt, '[JWT_REDACTED]')
			.replace(PII_PATTERNS.urlWithToken, (match) => {
				try {
					const url = new URL(match);
					const params = ['token', 'key', 'secret', 'auth', 'api_key', 'apikey', 'access_token'];
					params.forEach(param => {
						if (url.searchParams.has(param)) {
							url.searchParams.set(param, '[REDACTED]');
						}
					});
					return url.toString();
				} catch {
					return '[URL_REDACTED]';
				}
			});
		return redacted;
	}

	// Standard - common PII
	if (level === 'standard' || level === 'strict') {
		redacted = redacted
			.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]')
			.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]')
			.replace(PII_PATTERNS.apiKey, '[API_KEY_REDACTED]')
			.replace(PII_PATTERNS.jwt, '[JWT_REDACTED]')
			.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]')
			.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]')
			.replace(PII_PATTERNS.urlWithToken, (match) => {
				const urlMatch = match.match(/^(https?:\/\/[^?]+)/);
				return urlMatch ? urlMatch[1] + '?[PARAMS_REDACTED]' : '[URL_REDACTED]';
			});
	}

	// Strict - additionally redact IPs
	if (level === 'strict') {
		redacted = redacted
			.replace(PII_PATTERNS.ipv4, '[IP_REDACTED]')
			.replace(PII_PATTERNS.ipv6, '[IP_REDACTED]');
	}

	return redacted;
}
```

#### 4. Update `sanitizeSimpleObject` function

```javascript
function sanitizeSimpleObject(obj) {
	const sanitized = {};
	for (const [key, value] of Object.entries(obj)) {
		const keyLower = String(key).toLowerCase();
		if (isSensitiveKey(keyLower)) {
			sanitized[key] = '[REDACTED]';
		} else if (typeof value === 'string') {
			// HIGH-SEC-002: Scan string values for PII
			sanitized[key] = redactPII(value, _redactionLevel);
		} else {
			sanitized[key] = value;
		}
	}
	return sanitized;
}
```

#### 5. Update `sanitizeObject` function (line 118+)

```javascript
function sanitizeObject(obj, depth = 0, seen = new WeakSet()) {
	// Fast path: primitives - scan strings for PII
	if (obj === null || obj === undefined) return obj;

	if (typeof obj !== 'object') {
		// HIGH-SEC-002: Redact PII from string primitives
		if (typeof obj === 'string') {
			return redactPII(obj, _redactionLevel);
		}
		return obj;
	}

	// ... rest of function stays the same, but update line 172:
				if (isSensitiveKey(keyLower)) {
					sanitized[key] = '[REDACTED]';
				} else if (typeof value === 'string') {
					// HIGH-SEC-002: Scan string values for PII
					sanitized[key] = redactPII(value, _redactionLevel);
				} else if (typeof value === 'object' && value !== null) {
					sanitized[key] = sanitizeObject(value, depth + 1, seen);
				} else {
					sanitized[key] = value;
				}
```

#### 6. Update `serializeError` function (line 193+)

```javascript
function serializeError(error) {
	if (!error) return undefined;

	if (error.__serialized) return error;

	if (typeof error !== 'object') {
		// HIGH-SEC-002: Redact PII from error messages
		return { message: redactPII(String(error), _redactionLevel) };
	}

	try {
		const serialized = {
			name: error.name ?? 'Error',
			// HIGH-SEC-002: Redact PII from error messages
			message: redactPII(error.message ?? String(error), _redactionLevel),
			// HIGH-SEC-001: Sanitize stack traces (use getter for performance)
			get stack() {
				return sanitizeStackTrace(error.stack ?? 'No stack trace available');
			}
		};

		// ... rest of function stays the same
```

#### 7. Update `queueNotification` function (line 289+)

```javascript
function queueNotification(level, message, error, immediate = false) {
	// HIGH-SEC-002: Redact PII from messages sent to handlers
	const payload = {
		level,
		message: redactPII(message, _redactionLevel),
		// HIGH-SEC-001 & HIGH-SEC-002: Use serialized error (already sanitized)
		error: serializeError(error),
		timestamp: new Date().toISOString()
	};

	// If error has properties, include them with sanitization
	if (error && typeof error === 'object') {
		if (error.name) payload.errorName = error.name;
		if (error.code) payload.errorCode = error.code;
		if (error.statusCode) payload.statusCode = error.statusCode;
		if (error.context) payload.context = sanitizeObject(error.context);
	}

	// ... rest of function stays the same
```

#### 8. Update `_log` method (line 533+)

```javascript
	_log(level, message, error, context, lazy = false) {
		const startTime = performance.now();

		const entry = {
			level,
			// HIGH-SEC-002: Redact PII from log messages
			message: redactPII(message, _redactionLevel),
			timestamp: new Date().toISOString(),
			timestampMs: Date.now()
		};

		// ... rest of method stays the same
```

#### 9. Add new methods to errorLogger object (after `clearHandlers`)

```javascript
	/**
	 * Set PII redaction level
	 * @param {'minimal' | 'standard' | 'strict'} level - Redaction level
	 */
	setRedactionLevel(level) {
		if (['minimal', 'standard', 'strict'].includes(level)) {
			_redactionLevel = level;
		}
	},

	/**
	 * Get current redaction level
	 * @returns {string} Current redaction level
	 */
	getRedactionLevel() {
		return _redactionLevel;
	},
```

### Testing

Run the security test suite:

```bash
npm test tests/unit/errors/logger-security.test.js
```

### Security Verification Checklist

- [ ] Stack traces do not contain absolute file paths in production
- [ ] Stack traces do not contain user-specific paths (/Users/john, etc.)
- [ ] Email addresses are redacted from logs
- [ ] Phone numbers are redacted from logs
- [ ] IP addresses are redacted in strict mode
- [ ] API keys and JWT tokens are redacted
- [ ] Credit card numbers are redacted
- [ ] SSNs are redacted
- [ ] URLs with tokens have query parameters sanitized
- [ ] Sensitive keys (password, token, etc.) are redacted from context objects
- [ ] Nested objects are properly sanitized
- [ ] Error handlers receive sanitized data
- [ ] Exported logs do not contain PII
- [ ] Diagnostic reports do not contain PII
- [ ] Redaction level can be configured
- [ ] Performance remains under 0.5ms per log entry

### Performance Impact

The PII redaction adds minimal overhead:
- Simple string scanning using pre-compiled regex (~0.1ms)
- Only applied to string values
- Uses lazy evaluation where possible
- Leverages existing memoization cache

Expected performance: <0.6ms per log entry (vs current <0.5ms target)

### Compliance

These enhancements help meet:
- **GDPR**: Automated PII minimization in logs
- **CCPA**: Reduced PII exposure
- **SOC 2**: Demonstrates data protection controls
- **HIPAA**: PHI protection in error logs (if applicable)

### Rollout Plan

1. **Phase 1**: Implement stack trace sanitization (HIGH-SEC-001)
2. **Phase 2**: Implement PII redaction with 'minimal' default
3. **Phase 3**: Switch to 'standard' redaction level
4. **Phase 4**: Monitor and tune based on false positives
5. **Phase 5**: Consider 'strict' mode for sensitive environments

### Configuration

Set redaction level in application initialization:

```javascript
import { errorLogger } from '$lib/errors/logger.js';

// For development
errorLogger.setRedactionLevel('minimal');

// For production
errorLogger.setRedactionLevel('standard');

// For highly sensitive data
errorLogger.setRedactionLevel('strict');
```

### Monitoring

Track redaction effectiveness:

```javascript
// Monitor what's being redacted
const logs = errorLogger.getLogs();
const redactedLogs = logs.filter(log =>
	log.message.includes('[EMAIL_REDACTED]') ||
	log.message.includes('[PHONE_REDACTED]') ||
	log.message.includes('[API_KEY_REDACTED]')
);

console.log(`${redactedLogs.length} logs contained PII`);
```

### False Positives

If legitimate data is being redacted:

1. Review PII_PATTERNS regex for overly broad matches
2. Consider whitelisting specific patterns
3. Adjust redaction level per environment
4. Document exceptions for compliance

### Security Incident Response

If PII is discovered in historical logs:

1. Identify affected log entries
2. Purge or redact affected logs
3. Notify affected users (if required by regulation)
4. Document incident for compliance
5. Review and strengthen PII patterns

### Future Enhancements

- Machine learning-based PII detection
- Custom PII patterns per deployment
- Encryption of redacted values (for debugging)
- PII detection metrics/alerts
- Integration with secret scanning tools
