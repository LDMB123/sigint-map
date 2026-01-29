# Security Remediation Guide - DMB Almanac
## Code Examples for Vulnerability Fixes

---

## Fix 1: Unsafe innerHTML in native-axis.js

### Current Code (VULNERABLE)
**File**: `/projects/dmb-almanac/app/src/lib/utils/native-axis.js:45`

```javascript
export function renderGridAxis(container, scale, options = {}) {
	// ... setup code ...

	// VULNERABLE: innerHTML with potential user input
	container.innerHTML = '';
	container.className = `axis axis-${orientation}`;
	// ... rest of function
}
```

### Remediation Option 1: Safe DOM Clearing (RECOMMENDED)

```javascript
/**
 * Render axis using CSS Grid layout (safe version)
 * @param {HTMLElement} container - Container element for axis
 * @param {Function} scale - Scale function (from native-scales.js)
 * @param {Object} options - Axis options
 * @param {string} [options.orientation='bottom'] - Axis orientation
 * @param {number} [options.tickCount=10] - Number of ticks
 * @param {Function} [options.tickFormat] - Tick label formatter
 * @param {string} [options.label] - Axis label
 * @returns {void}
 */
export function renderGridAxis(container, scale, options = {}) {
	const {
		orientation = 'bottom',
		tickCount = 10,
		tickFormat = (d) => String(d),
		label = '',
	} = options;

	// Get tick values from scale
	const ticks = scale.ticks ? scale.ticks(tickCount) : scale.domain();

	// SAFE: Clear container using removeChild instead of innerHTML
	while (container.firstChild) {
		container.removeChild(container.firstChild);
	}

	// SAFE: Set classname
	container.className = `axis axis-${orientation}`;

	// Create axis container with CSS Grid
	const axisGrid = document.createElement('div');
	axisGrid.className = 'axis-grid';
	axisGrid.style.display = 'grid';

	if (orientation === 'bottom' || orientation === 'top') {
		// Horizontal axis
		axisGrid.style.gridTemplateColumns = `repeat(${ticks.length}, 1fr)`;
		axisGrid.style.gridTemplateRows = '1fr auto';
		axisGrid.style.width = '100%';
		axisGrid.style.height = '40px';

		ticks.forEach((tick, i) => {
			// Tick mark
			const tickMark = document.createElement('div');
			tickMark.className = 'axis-tick';
			tickMark.style.borderLeft = i === 0 ? 'none' : '1px solid #e5e7eb';
			tickMark.style.height = '6px';
			tickMark.style.gridRow = orientation === 'bottom' ? '1' : '2';
			tickMark.style.gridColumn = i + 1;
			axisGrid.appendChild(tickMark);

			// Tick label - SAFE: Use textContent (already correct)
			const tickLabel = document.createElement('div');
			tickLabel.className = 'axis-label';
			tickLabel.textContent = tickFormat(tick);  // ✓ SAFE
			tickLabel.style.gridRow = orientation === 'bottom' ? '2' : '1';
			tickLabel.style.gridColumn = i + 1;
			tickLabel.style.textAlign = 'center';
			tickLabel.style.fontSize = '11px';
			tickLabel.style.color = 'var(--foreground, #333)';
			axisGrid.appendChild(tickLabel);
		});

		// SAFE: Label handling with sanitization
		if (label) {
			import('$lib/security/sanitize.js').then(({ escapeHtml }) => {
				const axisLabel = document.createElement('div');
				axisLabel.className = 'axis-label-title';
				// Escape any user input in the label
				axisLabel.textContent = escapeHtml(label);  // ✓ SAFE
				axisLabel.style.marginTop = '8px';
				axisLabel.style.textAlign = 'center';
				axisLabel.style.fontSize = '12px';
				axisLabel.style.fontWeight = 'bold';
				axisGrid.appendChild(axisLabel);
			});
		}
	}

	container.appendChild(axisGrid);
}
```

### Remediation Option 2: innerHTML with Sanitization (If HTML is Needed)

```javascript
import { sanitizeHtml, escapeHtml } from '$lib/security/sanitize.js';

export function renderGridAxis(container, scale, options = {}) {
	// ... existing code ...

	// If you need to set HTML content:
	if (htmlContent) {
		// Option A: Escape plain text (BEST)
		container.innerHTML = `<div>${escapeHtml(userContent)}</div>`;

		// Option B: Sanitize HTML (if HTML tags are intentional)
		const sanitized = sanitizeHtml(userContent);
		container.innerHTML = sanitized;

		// Option C: Use the helper function (SIMPLEST)
		import('$lib/security/sanitize.js').then(({ setSafeInnerHTML }) => {
			setSafeInnerHTML(container, userContent);
		});
	}
}
```

---

## Fix 2: localStorage JSON Parsing Without Validation

### Current Code (VULNERABLE)
**File**: `/projects/dmb-almanac/app/src/lib/pwa/pushNotificationEnhanced.js:225`

```javascript
function loadFromStorage() {
	const storedTopics = localStorage.getItem(STORAGE_KEYS.TOPICS);
	// VULNERABLE: Crashes if corrupted JSON
	const topicSubscriptions = storedTopics ? JSON.parse(storedTopics) : [];

	const storedQuietHours = localStorage.getItem(STORAGE_KEYS.QUIET_HOURS);
	// VULNERABLE: Crashes if corrupted JSON
	const quietHours = storedQuietHours ? JSON.parse(storedQuietHours) : [];

	const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
	// VULNERABLE: Crashes if corrupted JSON
	const notificationHistory = storedHistory ? JSON.parse(storedHistory) : [];
}
```

### Remediation: Add Safe Parsing Wrapper

```javascript
/**
 * Safely parse JSON from localStorage with error recovery
 * @template T
 * @param {string|null} value - JSON string from localStorage
 * @param {T} defaultValue - Default value if parse fails
 * @param {Function} [validator] - Optional validation function
 * @returns {T|null} Parsed value or default
 */
function safeJsonParse(value, defaultValue, validator) {
	if (!value) return defaultValue;

	try {
		const parsed = JSON.parse(value);

		// Optional: Validate structure
		if (validator) {
			const isValid = validator(parsed);
			if (!isValid) {
				console.warn('Invalid storage data structure, using default');
				return defaultValue;
			}
		}

		return parsed;
	} catch (error) {
		if (error instanceof SyntaxError) {
			console.warn('Corrupted localStorage data, using default:', error.message);
			// Optionally clear the corrupted data
			// localStorage.removeItem(storageKey);
		} else {
			console.error('Unexpected error parsing localStorage:', error);
		}
		return defaultValue;
	}
}

// Usage throughout the application:
function loadFromStorage() {
	// Safe parsing with default values
	const topicSubscriptions = safeJsonParse(
		localStorage.getItem(STORAGE_KEYS.TOPICS),
		new Map(),  // Default: empty Map
		(data) => data instanceof Object && !Array.isArray(data)  // Validator
	);

	const quietHours = safeJsonParse(
		localStorage.getItem(STORAGE_KEYS.QUIET_HOURS),
		{ start: 22, end: 8 },  // Default: 10 PM - 8 AM
		(data) => (
			typeof data === 'object' &&
			typeof data.start === 'number' &&
			typeof data.end === 'number'
		)
	);

	const notificationHistory = safeJsonParse(
		localStorage.getItem(STORAGE_KEYS.HISTORY),
		[],  // Default: empty array
		(data) => Array.isArray(data)
	);

	// ... rest of function
}
```

### Alternative: Create a Type-Safe Storage Wrapper

```javascript
/**
 * Type-safe localStorage wrapper with automatic serialization
 * and error recovery
 */
class SafeStorage {
	constructor(prefix = 'dmb-') {
		this.prefix = prefix;
	}

	/**
	 * Get value from storage
	 * @template T
	 * @param {string} key
	 * @param {T} defaultValue
	 * @returns {T}
	 */
	get(key, defaultValue) {
		try {
			const stored = localStorage.getItem(this.prefix + key);
			if (!stored) return defaultValue;

			const parsed = JSON.parse(stored);
			return parsed !== null ? parsed : defaultValue;
		} catch (error) {
			console.warn(`Failed to read storage key "${key}":`, error.message);
			return defaultValue;
		}
	}

	/**
	 * Set value in storage
	 * @param {string} key
	 * @param {unknown} value
	 * @returns {boolean} Success flag
	 */
	set(key, value) {
		try {
			const serialized = JSON.stringify(value);
			localStorage.setItem(this.prefix + key, serialized);
			return true;
		} catch (error) {
			console.warn(`Failed to write storage key "${key}":`, error.message);
			return false;
		}
	}

	/**
	 * Remove value from storage
	 * @param {string} key
	 */
	remove(key) {
		try {
			localStorage.removeItem(this.prefix + key);
		} catch (error) {
			console.warn(`Failed to remove storage key "${key}":`, error.message);
		}
	}

	/**
	 * Clear all storage with this prefix
	 */
	clear() {
		try {
			const keys = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(this.prefix)) {
					keys.push(key);
				}
			}
			keys.forEach(key => localStorage.removeItem(key));
		} catch (error) {
			console.warn('Failed to clear storage:', error.message);
		}
	}
}

// Usage:
const storage = new SafeStorage('dmb-notifications-');

function loadFromStorage() {
	const topicSubscriptions = storage.get('topics', new Map());
	const quietHours = storage.get('quiet-hours', { start: 22, end: 8 });
	const notificationHistory = storage.get('history', []);

	// ... rest of function
}

// When saving:
storage.set('topics', topicSubscriptions);
storage.set('quiet-hours', quietHours);
storage.set('history', notificationHistory);
```

---

## Fix 3: CSP Development Mode Unsafe-Inline

### Current Code (VULNERABLE)
**File**: `/projects/dmb-almanac/app/src/hooks.server.js:587-589`

```javascript
const cspDirectives = [
	"default-src 'self'",
	// VULNERABLE: Development mode allows inline scripts
	isDev
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
		: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
	// ... rest of directives
];
```

### Remediation: Nonce-Based CSP for All Modes

```javascript
/**
 * Enhanced CSP with nonce support in both development and production
 * This allows HMR in development while maintaining XSS protection
 */

// In hooks.server.js handle() function:

export const handle = async ({ event, resolve }) => {
	// ... existing code ...

	// Generate CSP nonce for inline scripts
	const nonce = generateCSPNonce();
	event.locals.cspNonce = nonce;

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-type' || name === 'content-length';
		}
	});

	// IMPROVED: Use nonce-based CSP for all environments
	const isDev = process.env.NODE_ENV === 'development';

	const cspDirectives = [
		"default-src 'self'",
		// Use nonce-based protection with strict-dynamic
		// Both dev and production get the same security level
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
		// In dev mode, allow WebSocket for HMR
		isDev
			? "connect-src 'self' ws: wss:"
			: "connect-src 'self'",
		"style-src 'self' 'unsafe-inline'",  // Inline styles have lower XSS risk
		"img-src 'self' data: https:",
		"font-src 'self' https://fonts.gstatic.com",
		"worker-src 'self'",
		"manifest-src 'self'",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'",
		'upgrade-insecure-requests',
		'report-uri /api/csp-report',
		'report-to csp-endpoint'
	];

	response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

	return response;
};

// Ensure SvelteKit scripts have the nonce attribute
// In svelte.config.js:
export default {
	kit: {
		adapter: adapter(),
		// ... other config ...
		vite: {
			// This helps SvelteKit inject nonce into its own scripts
			define: {
				'__NONCE__': JSON.stringify('%sveltekit.nonce%')
			}
		}
	}
};
```

### Alternative: Keep unsafe-inline but Seal It to Specific Scripts

```javascript
/**
 * If you need to keep 'unsafe-inline' for development,
 * at least limit it to the HMR script tag
 */

// In src/app.html or your layout:
<script nonce="%sveltekit.nonce%">
	// HMR script - can use inline code with nonce
	if (import.meta.hot) {
		import.meta.hot.accept();
	}
</script>

// Then in hooks.server.js:
const cspDirectives = isDev
	// Development: allow nonce-based inline (for HMR)
	? `script-src 'self' 'nonce-${nonce}'`
	// Production: strict nonce + strict-dynamic
	: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
```

---

## Fix 4: Storage Quota Monitoring (Bonus)

### Implementation: Check Storage Before Writing

```javascript
/**
 * Check available storage quota and warn when approaching limit
 * Helps prevent storage exhaustion attacks
 */

async function checkStorageQuota() {
	if (!navigator.storage?.estimate) {
		console.warn('Storage quota estimation not available');
		return null;
	}

	try {
		const estimate = await navigator.storage.estimate();
		const percentUsed = (estimate.usage / estimate.quota) * 100;

		return {
			used: estimate.usage,
			quota: estimate.quota,
			available: estimate.quota - estimate.usage,
			percentUsed: percentUsed,
			isCritical: percentUsed > 90,
			isWarning: percentUsed > 75
		};
	} catch (error) {
		console.error('Failed to estimate storage quota:', error);
		return null;
	}
}

/**
 * Safe storage write with quota checking
 */
async function setStorageItemWithQuota(key, value, options = {}) {
	const {
		maxRetries = 3,
		clearOldestIfFull = true
	} = options;

	try {
		// Check quota before attempting write
		const quota = await checkStorageQuota();

		if (quota?.isCritical) {
			if (clearOldestIfFull) {
				console.warn('Storage quota critical, attempting cleanup...');
				clearOldestStorageEntries(5);  // Clear 5 oldest entries
			} else {
				throw new Error('Storage quota exhausted');
			}
		}

		// Attempt write
		const serialized = JSON.stringify(value);
		localStorage.setItem(key, serialized);

		if (quota?.isWarning) {
			console.warn(`[Storage] ${quota.percentUsed.toFixed(1)}% quota used`);
		}

		return true;
	} catch (error) {
		if (error.name === 'QuotaExceededError') {
			console.error('localStorage quota exceeded:', error);
			return false;
		}
		throw error;
	}
}

/**
 * Simple LRU cache: remove oldest entries to free space
 */
function clearOldestStorageEntries(count = 5) {
	const entries = [];

	// Collect all entries with timestamps
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key?.startsWith('dmb-')) continue;

		const timestamp = parseInt(
			localStorage.getItem(`${key}:ts`) || Date.now()
		);

		entries.push({ key, timestamp });
	}

	// Sort by timestamp (oldest first) and remove
	entries
		.sort((a, b) => a.timestamp - b.timestamp)
		.slice(0, count)
		.forEach(({ key }) => {
			localStorage.removeItem(key);
			localStorage.removeItem(`${key}:ts`);
		});
}

// Usage:
async function saveNotificationHistory(history) {
	const success = await setStorageItemWithQuota(
		'notification-history',
		history,
		{ clearOldestIfFull: true }
	);

	if (!success) {
		console.error('Failed to save notification history');
		// Fallback: show limited history in memory only
	}
}
```

---

## Testing the Fixes

### Unit Tests for Safe Parsing

```javascript
// tests/unit/utils/storage.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeJsonParse } from '$lib/utils/safe-storage';

describe('safeJsonParse', () => {
	it('should parse valid JSON', () => {
		const result = safeJsonParse('{"key":"value"}', {});
		expect(result).toEqual({ key: 'value' });
	});

	it('should return default for null input', () => {
		const defaultValue = {};
		const result = safeJsonParse(null, defaultValue);
		expect(result).toBe(defaultValue);
	});

	it('should return default for empty string', () => {
		const result = safeJsonParse('', []);
		expect(result).toEqual([]);
	});

	it('should return default for invalid JSON', () => {
		const defaultValue = [];
		const result = safeJsonParse('{invalid json}', defaultValue);
		expect(result).toBe(defaultValue);
	});

	it('should validate parsed data', () => {
		const validator = (data) => Array.isArray(data);
		const result = safeJsonParse('[1,2,3]', [], validator);
		expect(result).toEqual([1, 2, 3]);
	});

	it('should return default if validation fails', () => {
		const validator = (data) => Array.isArray(data);
		const defaultValue = [];
		const result = safeJsonParse('{"notArray":true}', defaultValue, validator);
		expect(result).toBe(defaultValue);
	});
});
```

### CSP Validation Test

```javascript
// tests/unit/security/csp.test.js
import { describe, it, expect } from 'vitest';

describe('CSP Headers', () => {
	it('should not use unsafe-inline in production', () => {
		const nodeEnv = 'production';
		// Mock environment
		process.env.NODE_ENV = nodeEnv;

		// CSP should not include unsafe-inline for scripts in prod
		const csp = generateCSP();
		expect(csp).not.toMatch(/script-src.*'unsafe-inline'/);
	});

	it('should use nonce in both dev and production', () => {
		const nonce = 'abc123';
		const csp = generateCSPWithNonce(nonce);
		expect(csp).toMatch(/nonce-abc123/);
	});
});
```

---

## Implementation Checklist

### For Developers
- [ ] Review and understand each fix
- [ ] Test fixes locally before committing
- [ ] Add unit tests for critical functions
- [ ] Update JSDoc comments with security notes
- [ ] Run full test suite to ensure no regressions

### For Security Review
- [ ] Verify all innerHTML uses are safe
- [ ] Confirm localStorage reads have error handling
- [ ] Test CSP in browser DevTools (check warnings)
- [ ] Verify CSRF tokens are included in state-changing requests
- [ ] Monitor CSP violation reports for XSS attempts

### Before Deployment
- [ ] All tests pass (unit + integration)
- [ ] CSP report endpoint is receiving data
- [ ] Security headers are present in production
- [ ] No console errors related to CSP violations
- [ ] Performance impact is acceptable

---

## Deployment Notes

### Non-Breaking Changes
These fixes are **non-breaking** and safe to deploy:
1. Native-axis DOM clearing
2. localStorage validation
3. CSP nonce improvements

### Verification After Deployment
```bash
# Check CSP is properly set
curl -I https://your-domain.com | grep Content-Security-Policy

# Monitor browser console for CSP violations
# Check /api/csp-report endpoint for violations

# Verify CSRF tokens are working
# (should see X-CSRF-Token in request headers)
```

---

## References

- [OWASP DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN: localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [RFC 7468: ABNF](https://datatracker.ietf.org/doc/html/rfc7468)

