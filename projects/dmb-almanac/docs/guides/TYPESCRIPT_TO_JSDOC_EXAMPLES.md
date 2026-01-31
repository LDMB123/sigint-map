# TypeScript to JSDoc Conversion Examples

**Visual guide showing TypeScript → JavaScript + JSDoc conversion patterns**

---

## 1. Interface → @typedef

### TypeScript (BEFORE)
```typescript
export interface AdaptiveConcurrencyConfig {
	minConcurrency: number;
	maxConcurrency: number;
	targetLatency: number;
	adjustmentFactor: number;
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @typedef {Object} AdaptiveConcurrencyConfig
 * @property {number} minConcurrency - Minimum parallel requests
 * @property {number} maxConcurrency - Maximum parallel requests
 * @property {number} targetLatency - Target latency in ms
 * @property {number} adjustmentFactor - Adjustment factor (0-1)
 */
```

---

## 2. Optional Properties

### TypeScript (BEFORE)
```typescript
export interface ScrapeOptions {
	includeHtml?: boolean;
	cacheTTL?: number;
	useCache?: boolean;
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @typedef {Object} ScrapeOptions
 * @property {boolean} [includeHtml] - Include HTML in response
 * @property {number} [cacheTTL] - Cache TTL in ms (default: 24 hours)
 * @property {boolean} [useCache] - Use cache (default: true)
 */
```

**Note**: Use `[propertyName]` for optional properties in JSDoc.

---

## 3. Union Types (Enums)

### TypeScript (BEFORE)
```typescript
export interface BackgroundScrapeJob {
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @typedef {'pending'|'in-progress'|'completed'|'failed'} JobStatus
 */

/**
 * @typedef {Object} BackgroundScrapeJob
 * @property {JobStatus} status - Job status
 */
```

---

## 4. Generic Functions

### TypeScript (BEFORE)
```typescript
async execute<T>(task: () => Promise<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		// implementation
	});
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * Execute a task with adaptive concurrency control
 * @template T
 * @param {() => Promise<T>} task - Task to execute
 * @returns {Promise<T>}
 */
async execute(task) {
	return new Promise((resolve, reject) => {
		// implementation
	});
}
```

---

## 5. Class with Constructor

### TypeScript (BEFORE)
```typescript
export class AdaptiveConcurrencyPool {
	private queue: Array<() => Promise<void>> = [];
	private active = 0;
	private currentConcurrency: number;

	constructor(config: Partial<AdaptiveConcurrencyConfig> = {}) {
		this.currentConcurrency = config.minConcurrency ?? 2;
	}
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * Adaptive concurrency pool
 */
export class AdaptiveConcurrencyPool {
	/**
	 * @param {Partial<AdaptiveConcurrencyConfig>} [config={}] - Pool configuration
	 */
	constructor(config = {}) {
		/** @type {Array<() => Promise<void>>} */
		this.queue = [];
		this.active = 0;
		this.currentConcurrency = config.minConcurrency ?? 2;
	}
}
```

---

## 6. Type Assertions

### TypeScript (BEFORE)
```typescript
const db = (event.target as IDBOpenDBRequest).result;
const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
```

### JavaScript + JSDoc (AFTER)
```javascript
const db = /** @type {IDBDatabase} */ (event.target?.result);
const cursor = /** @type {IDBCursorWithValue|null} */ (event.target?.result);
```

**Note**: Use optional chaining (`?.`) for safer property access.

---

## 7. Async Generator (Complex Return Type)

### TypeScript (BEFORE)
```typescript
async *scrapeUrlsStreaming(
	urls: string[],
	options: ScrapeOptions = {}
): AsyncGenerator<ScrapeResult | { error: string; url: string }, void, unknown> {
	for (const url of urls) {
		yield result;
	}
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * Stream results as they complete
 * @param {string[]} urls - URLs to scrape
 * @param {ScrapeOptions} [options={}] - Scrape options
 * @returns {AsyncGenerator<ScrapeResult|{error: string, url: string}, void, unknown>}
 */
async *scrapeUrlsStreaming(urls, options = {}) {
	for (const url of urls) {
		yield result;
	}
}
```

---

## 8. Complex Nested Types

### TypeScript (BEFORE)
```typescript
export interface BatchResult<T> {
	successful: T[];
	failed: Array<{ url: string; error: string }>;
	metrics: {
		totalDuration: number;
		averageLatency: number;
		totalCredits: number;
	};
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @typedef {Object} BatchMetrics
 * @property {number} totalDuration - Total duration (ms)
 * @property {number} averageLatency - Average latency per request (ms)
 * @property {number} totalCredits - Total API credits consumed
 */

/**
 * @typedef {Object} BatchResult
 * @property {ScrapeResult[]} successful - Successful results
 * @property {Array<{url: string, error: string}>} failed - Failed requests
 * @property {BatchMetrics} metrics - Batch metrics
 */
```

---

## 9. Function with Multiple Optional Parameters

### TypeScript (BEFORE)
```typescript
async scrapeUrls(
	urls: string[],
	options: ScrapeOptions & { cacheTTL?: number; useCache?: boolean } = {}
): Promise<BatchResult> {
	// implementation
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * Batch scrape URLs with adaptive concurrency
 * @param {string[]} urls - URLs to scrape
 * @param {ScrapeOptions & {cacheTTL?: number, useCache?: boolean}} [options={}] - Scrape options
 * @returns {Promise<BatchResult>}
 */
async scrapeUrls(urls, options = {}) {
	// implementation
}
```

---

## 10. Import Type References

### TypeScript (BEFORE)
```typescript
import { ScrapeOptions, ScrapeResult } from './firecrawl';

export function processScrapeResults(
	results: ScrapeResult[],
	options: ScrapeOptions
): void {
	// implementation
}
```

### JavaScript + JSDoc (AFTER)
```javascript
import { getFirecrawlClient } from './firecrawl.js';

/**
 * Process scrape results
 * @param {import('./firecrawl.js').ScrapeResult[]} results - Scrape results
 * @param {import('./firecrawl.js').ScrapeOptions} options - Options
 * @returns {void}
 */
export function processScrapeResults(results, options) {
	// implementation
}
```

**Note**: Import types inline with `import('./module.js').TypeName`.

---

## 11. Callback Functions

### TypeScript (BEFORE)
```typescript
interface BatchProgress {
	total: number;
	completed: number;
}

constructor(
	config: AdaptiveConcurrencyConfig,
	options: {
		onProgress?: (progress: BatchProgress) => void;
	}
) {
	this.progressCallback = options.onProgress;
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @typedef {Object} BatchProgress
 * @property {number} total - Total items
 * @property {number} completed - Completed items
 */

/**
 * @param {AdaptiveConcurrencyConfig} config - Configuration
 * @param {Object} options - Options
 * @param {(progress: BatchProgress) => void} [options.onProgress] - Progress callback
 */
constructor(config, options) {
	this.progressCallback = options.onProgress;
}
```

---

## 12. Nullable Types

### TypeScript (BEFORE)
```typescript
class FirecrawlCache {
	private db: IDBDatabase | null = null;

	async get(url: string): Promise<CacheEntry | null> {
		// implementation
	}
}
```

### JavaScript + JSDoc (AFTER)
```javascript
export class FirecrawlCache {
	constructor() {
		/** @type {IDBDatabase|null} */
		this.db = null;
	}

	/**
	 * Get cached result by URL
	 * @param {string} url - URL to lookup
	 * @returns {Promise<CacheEntry|null>}
	 */
	async get(url) {
		// implementation
	}
}
```

---

## 13. Partial Types

### TypeScript (BEFORE)
```typescript
constructor(config: Partial<AdaptiveConcurrencyConfig> = {}) {
	this.config = {
		minConcurrency: config.minConcurrency ?? 2,
		maxConcurrency: config.maxConcurrency ?? 10
	};
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @param {Partial<AdaptiveConcurrencyConfig>} [config={}] - Pool configuration
 */
constructor(config = {}) {
	/** @type {AdaptiveConcurrencyConfig} */
	this.config = {
		minConcurrency: config.minConcurrency ?? 2,
		maxConcurrency: config.maxConcurrency ?? 10,
		targetLatency: config.targetLatency ?? 2000,
		adjustmentFactor: config.adjustmentFactor ?? 0.3
	};
}
```

**Note**: `Partial<T>` works identically in JSDoc.

---

## 14. Private Methods

### TypeScript (BEFORE)
```typescript
export class AdaptiveConcurrencyPool {
	private processQueue(): void {
		// implementation
	}

	private recordLatency(latency: number): void {
		// implementation
	}
}
```

### JavaScript + JSDoc (AFTER)
```javascript
export class AdaptiveConcurrencyPool {
	/**
	 * Process queued tasks
	 * @private
	 * @returns {void}
	 */
	processQueue() {
		// implementation
	}

	/**
	 * Record latency and adjust concurrency
	 * @private
	 * @param {number} latency - Request latency (ms)
	 * @returns {void}
	 */
	recordLatency(latency) {
		// implementation
	}
}
```

**Note**: Use `@private` to mark private methods in JSDoc.

---

## 15. Array Methods with Type Inference

### TypeScript (BEFORE)
```typescript
const results: ScrapeResult[] = [];
const failed: Array<{ url: string; error: string }> = [];

results.push(result);
failed.push({ url, error: error.message });
```

### JavaScript + JSDoc (AFTER)
```javascript
/** @type {ScrapeResult[]} */
const results = [];

/** @type {Array<{url: string, error: string}>} */
const failed = [];

results.push(result);
failed.push({ url, error: error instanceof Error ? error.message : 'Unknown error' });
```

---

## 16. Return Type Objects

### TypeScript (BEFORE)
```typescript
getPoolStats(): {
	concurrency: number;
	averageLatency: number;
	peakConcurrency: number;
} {
	return {
		concurrency: this.pool.getConcurrency(),
		averageLatency: this.pool.getAverageLatency(),
		peakConcurrency: this.pool.getPeakConcurrency()
	};
}
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * Get current pool statistics
 * @returns {{concurrency: number, averageLatency: number, peakConcurrency: number}}
 */
getPoolStats() {
	return {
		concurrency: this.pool.getConcurrency(),
		averageLatency: this.pool.getAverageLatency(),
		peakConcurrency: this.pool.getPeakConcurrency()
	};
}
```

---

## 17. Error Handling with Type Guards

### TypeScript (BEFORE)
```typescript
try {
	// operation
} catch (error: any) {
	failed.push({
		url,
		error: error.message || 'Unknown error'
	});
}
```

### JavaScript + JSDoc (AFTER)
```javascript
try {
	// operation
} catch (error) {
	failed.push({
		url,
		error: error instanceof Error ? error.message : 'Unknown error'
	});
}
```

**Note**: Use `error instanceof Error` for type-safe error handling.

---

## 18. Module Exports

### TypeScript (BEFORE)
```typescript
export interface AdaptiveConcurrencyConfig { /* ... */ }
export class AdaptiveConcurrencyPool { /* ... */ }
export class OptimizedBatchScraper { /* ... */ }
```

### JavaScript + JSDoc (AFTER)
```javascript
/**
 * @typedef {Object} AdaptiveConcurrencyConfig
 * @property {number} minConcurrency
 */

export class AdaptiveConcurrencyPool { /* ... */ }
export class OptimizedBatchScraper { /* ... */ }
```

**Note**: `@typedef` definitions don't need `export` - they're automatically available.

---

## Conversion Checklist

When converting TypeScript to JavaScript + JSDoc:

- [ ] Replace `interface` with `/** @typedef {Object} */`
- [ ] Replace `: Type` with `@param {Type}` or `@returns {Type}`
- [ ] Replace `type as CastType` with `/** @type {CastType} */ (value)`
- [ ] Replace `<T>` generics with `@template T`
- [ ] Replace `Type | null` with `{Type|null}`
- [ ] Replace `Type[]` with `{Type[]}`
- [ ] Replace `Array<Type>` with `{Array<Type>}` or `{Type[]}`
- [ ] Add `.js` extension to all imports
- [ ] Use `?.` optional chaining for safety
- [ ] Use `??` nullish coalescing for defaults
- [ ] Use `instanceof` for runtime type checking
- [ ] Add `@private` for private methods/properties

---

## VSCode IntelliSense Comparison

Both provide **identical** IDE support:

### TypeScript
```typescript
const scraper = new OptimizedBatchScraper();
scraper.scrapeUrls(urls, {
	useCache: "yes" // ❌ Type error: string not assignable to boolean
});
```

### JavaScript + JSDoc
```javascript
const scraper = new OptimizedBatchScraper();
scraper.scrapeUrls(urls, {
	useCache: "yes" // ❌ Type error: string not assignable to boolean
});
```

**Result**: Same error, same IntelliSense, zero compilation.

---

## Benefits of JavaScript + JSDoc

✅ **Zero compilation overhead** - Direct browser execution
✅ **Smaller bundle size** - No TypeScript runtime helpers
✅ **Same type safety** - Full IDE IntelliSense
✅ **Better debugging** - No source maps needed (JS is the source)
✅ **Faster iteration** - No build step for type changes
✅ **Simpler toolchain** - Optional TypeScript dependency

---

**All patterns are production-ready for Chromium 143+ on Apple Silicon.**
