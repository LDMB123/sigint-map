# Bundle Optimization - Copy/Paste Ready Code Snippets

All code snippets below are ready to use. Simply copy and paste into the specified files.

---

## 1. vite.config.ts - Enhanced Configuration

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts`

**Replace entire file with:**

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import visualizer from 'rollup-plugin-visualizer';

// Generate build timestamp for service worker cache versioning
// Format: YYYYMMDDHHMM (e.g., 202601221430)
const BUILD_TIMESTAMP = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 12);

export default defineConfig({
	plugins: [
		wasm(),
		topLevelAwait(),
		sveltekit(),
		// Add bundle visualization tool
		visualizer({
			filename: 'dist/bundle-report.html',
			open: process.env.ANALYZE === 'true',
			gzipSize: true,
			brotliSize: true
		})
	],
	// Inject build-time constants for service worker and app
	define: {
		__BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/lib/utils/test-setup.ts']
	},
	optimizeDeps: {
		include: ['dexie'],
		// Exclude WASM packages from dependency optimization
		exclude: ['dmb-transform', 'dmb-segue-analysis', 'dmb-date-utils']
	},
	build: {
		target: 'es2022',
		minify: 'terser',
		chunkSizeWarningLimit: 500,  // Warn if chunks exceed 500KB
		reportCompressedSize: true,   // Show gzip sizes in build output
		terserOptions: {
			compress: {
				drop_console: true,  // Remove console.log/warn/error in production
				passes: 3            // More aggressive compression (slower build)
			},
			mangle: true,
			output: {
				comments: false      // Remove all comments
			}
		},
		rollupOptions: {
			output: {
				// Generate optimized code for modern browsers
				generatedCode: {
					constBindings: true,    // Use const instead of var
					arrowFunctions: true,   // Use arrow functions where possible
					objectShorthand: true   // Use shorthand object properties
				},
				// Manual code splitting for better caching
				manualChunks(id) {
					// Split vendor D3 libraries into separate chunks
					if (id.includes('node_modules')) {
						// Core D3 modules used in multiple visualizations
						if (id.includes('d3-selection') ||
						    id.includes('d3-scale') ||
						    id.includes('d3-axis')) {
							return 'd3-core';
						}
						// Geo-specific modules (TourMap)
						if (id.includes('d3-geo') ||
						    id.includes('topojson-client')) {
							return 'd3-geo';
						}
						// Force simulation modules (GuestNetwork)
						if (id.includes('d3-force') ||
						    id.includes('d3-drag')) {
							return 'd3-force';
						}
						// Sankey diagram (TransitionFlow)
						if (id.includes('d3-sankey')) {
							return 'd3-sankey';
						}
						// Database
						if (id.includes('dexie')) {
							return 'dexie';
						}
					}
				},
				// Asset file naming with hash for cache busting
				assetFileNames: (assetInfo) => {
					// WASM files in dedicated folder
					if (assetInfo.name?.endsWith('.wasm')) {
						return 'wasm/[name]-[hash][extname]';
					}
					// Regular assets
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
	},
	// Apple Silicon optimized settings
	server: {
		fs: {
			allow: ['..']
		}
	}
});
```

**Changes made:**
- Added `rollup-plugin-visualizer` import
- Added visualizer plugin configuration
- Added `chunkSizeWarningLimit: 500` for chunk size monitoring
- Added `reportCompressedSize: true` to show gzip sizes
- Added comprehensive terser options with `drop_console: true`
- Enhanced generatedCode options for better minification
- Improved manual chunk splitting with better D3 organization

**Installation needed:**
```bash
npm install --save-dev rollup-plugin-visualizer
```

---

## 2. package.json - Remove Extraneous Dependencies

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/package.json`

**Remove these lines from `devDependencies`:**

```json
"@types/d3-array": "^3.2.2",
"@types/d3-scale-chromatic": "^3.1.0",
"@types/d3-transition": "^3.0.9",
```

**Remove from `dependencies`:**

```json
"d3-scale-chromatic": "^3.1.0",
```

**Then run:**
```bash
npm install
```

Or automated:
```bash
npm uninstall d3-scale-chromatic @types/d3-scale-chromatic @types/d3-array @types/d3-transition
```

---

## 3. package.json - Add Compression Plugin

**Add to `devDependencies` in package.json:**

```json
"vite-plugin-compression": "^0.5.1"
```

**Install:**
```bash
npm install --save-dev vite-plugin-compression
```

**Then update vite.config.ts to include:**

```typescript
import compression from 'vite-plugin-compression';

export default defineConfig({
	plugins: [
		// ... existing plugins
		compression({
			algorithm: 'gzip',
			ext: '.gz',
			deleteOriginFile: false,
		}),
		compression({
			algorithm: 'brotli',
			ext: '.br',
			deleteOriginFile: false,
		})
	]
});
```

This automatically compresses your build output and tells servers to use the compressed versions.

---

## 4. src/app.html - Enhanced Head Configuration

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/app.html`

**Replace the entire file with:**

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />

		<!-- ==================== RESOURCE HINTS FOR CRITICAL PATHS ==================== -->
		<!-- Font preloading for LCP optimization (Chromium 2025) -->
		<!-- Variable fonts: single file covers all weights/styles -->
		<link
			rel="preload"
			href="%sveltekit.assets%/fonts/inter-var.woff2"
			as="font"
			type="font/woff2"
			crossorigin
			fetchpriority="high"
		/>
		<link
			rel="preload"
			href="%sveltekit.assets%/fonts/inter-var-italic.woff2"
			as="font"
			type="font/woff2"
			crossorigin
			fetchpriority="low"
		/>

		<!-- DNS prefetch for potential future API endpoints -->
		<link rel="dns-prefetch" href="https://api.dmbalmanac.com" />

		<!-- Preload Web Manifest for PWA (critical for offline capability) -->
		<link rel="manifest" href="%sveltekit.assets%/manifest.json" />

		<!-- Critical resources with priority hints -->
		<link rel="icon" href="%sveltekit.assets%/favicon.ico" fetchpriority="low" />
		<link rel="apple-touch-icon" href="%sveltekit.assets%/icons/apple-touch-icon.png" />

		<!-- Viewport configuration for responsive design -->
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

		<!-- Theme and PWA metadata -->
		<meta name="theme-color" content="#030712" />
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		<meta name="apple-mobile-web-app-title" content="DMB Almanac" />
		<meta name="color-scheme" content="dark light" />

		<!-- ==================== SPECULATION RULES API (Chromium 2025) ==================== -->
		<!-- Inline speculation rules for fastest initialization (no network request) -->
		<!-- Chrome 109+: Intelligent prerendering/prefetching for instant navigation -->
		<!-- Prerender common routes on app startup, prefetch with hover intent -->
		<script type="speculationrules">
		{
			"prerender": [
				{
					"where": { "href_matches": "/songs" },
					"eagerness": "eager"
				},
				{
					"where": { "href_matches": "/tours" },
					"eagerness": "eager"
				},
				{
					"where": { "href_matches": "/venues" },
					"eagerness": "eager"
				},
				{
					"where": { "href_matches": "/liberation" },
					"eagerness": "moderate"
				},
				{
					"where": { "selector_matches": ".hero-link, .featured-link, [data-prerender=\"true\"]" },
					"eagerness": "eager"
				},
				{
					"where": {
						"and": [
							{ "href_matches": "/tours/*" },
							{ "selector_matches": "a[href^=\"/tours/202\"]" }
						]
					},
					"eagerness": "moderate"
				},
				{
					"where": {
						"and": [
							{ "href_matches": "/shows/*" },
							{ "selector_matches": "[data-priority=\"eager\"] a" }
						]
					},
					"eagerness": "eager"
				}
			],
			"prefetch": [
				{
					"where": {
						"and": [
							{ "href_matches": "/*" },
							{ "not": { "href_matches": "/api/*" } },
							{ "not": { "href_matches": "/_next/*" } }
						]
					},
					"eagerness": "conservative",
					"referrer_policy": "strict-origin-when-cross-origin"
				},
				{
					"where": {
						"selector_matches": "nav a, a[href^=\"/songs\"], a[href^=\"/tours\"], a[href^=\"/venues\"], a[href^=\"/guests\"], .show-card"
					},
					"eagerness": "moderate"
				},
				{
					"where": { "selector_matches": "a[href^=\"/shows/\"]" },
					"eagerness": "moderate"
				}
			]
		}
		</script>

		<!-- Optional: External speculation rules for dynamic updates -->
		<!-- <link rel="speculationrules" href="%sveltekit.assets%/speculation-rules.json" /> -->

		<!-- SvelteKit head injection point -->
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

**Key changes:**
- Already well-configured
- Minor additions: Added `.show-card` to prefetch hints
- Explicit `referrer_policy` in prefetch rules for security

---

## 5. Build Analysis Script

**Create file:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scripts/analyze-bundle.sh`

```bash
#!/bin/bash

echo "========================================"
echo "DMB Almanac Bundle Analysis"
echo "========================================"
echo ""

echo "Building with analysis enabled..."
ANALYZE=true npm run build

echo ""
echo "Bundle Report: open dist/bundle-report.html"
echo ""

echo "Build output sizes:"
du -sh .svelte-kit/output/client/assets/*

echo ""
echo "Total build size:"
du -sh .svelte-kit/output/client/

echo ""
echo "Checking for console logs in source:"
grep -r "console\." src/ --include="*.ts" --include="*.svelte" | grep -v "//" | wc -l

echo ""
echo "========================================"
```

**Make executable and run:**
```bash
chmod +x scripts/analyze-bundle.sh
./scripts/analyze-bundle.sh
```

---

## 6. Performance Monitoring Script

**Create file:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/scripts/check-bundle-size.js`

```javascript
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLIENT_DIR = '.svelte-kit/output/client';

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function getGzipSize(buffer) {
  const { gzipSync } = require('zlib');
  return gzipSync(buffer).length;
}

function analyzeBundle() {
  const limits = {
    'd3-core': 50000,
    'd3-force': 100000,
    'd3-geo': 50000,
    'd3-sankey': 30000,
    'dexie': 100000,
    '_app': 150000,
    'total': 1200000
  };

  console.log('\n=== Bundle Size Analysis ===\n');

  let totalSize = 0;
  const chunks = {};

  // Get all JS files
  const assetDir = path.join(CLIENT_DIR, 'assets');
  if (fs.existsSync(assetDir)) {
    fs.readdirSync(assetDir)
      .filter(f => f.endsWith('.js'))
      .forEach(file => {
        const filePath = path.join(assetDir, file);
        const buffer = fs.readFileSync(filePath);
        const raw = buffer.length;
        const gzip = getGzipSize(buffer);

        const chunkName = file.split('-')[0];
        chunks[chunkName] = (chunks[chunkName] || 0) + gzip;
        totalSize += gzip;

        // Check against limits
        if (limits[chunkName] && gzip > limits[chunkName]) {
          console.warn(`⚠️  ${chunkName}: ${(gzip / 1000).toFixed(1)}KB exceeds limit ${(limits[chunkName] / 1000).toFixed(1)}KB`);
        }
      });
  }

  // Report
  console.log('Chunk Sizes (gzip):');
  Object.entries(chunks)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, size]) => {
      const mb = (size / 1024 / 1024).toFixed(2);
      const kb = (size / 1000).toFixed(1);
      console.log(`  ${name.padEnd(15)} ${kb.padStart(6)}KB (${mb}MB)`);
    });

  console.log(`\nTotal (gzip): ${(totalSize / 1000).toFixed(1)}KB`);

  if (totalSize > limits.total) {
    console.error(`\n❌ Total exceeds limit of ${(limits.total / 1000).toFixed(1)}KB`);
    process.exit(1);
  } else {
    console.log(`✅ Total within limit of ${(limits.total / 1000).toFixed(1)}KB`);
  }
}

analyzeBundle();
```

**Add to package.json scripts:**
```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "check:bundle": "node scripts/check-bundle-size.js"
  }
}
```

**Run after build:**
```bash
npm run build && npm run check:bundle
```

---

## 7. Service Worker Data Caching Strategy

**Create file:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/pwa/data-cache.ts`

```typescript
/**
 * Lazy-load large data files in service worker
 * Prevents 26MB static data from blocking initial page load
 */

const CACHE_NAME = 'dmb-data-v1';

const DATA_FILES = [
  { url: '/data/shows.json', priority: 'critical', size: '2.1MB' },
  { url: '/data/venues.json', priority: 'critical', size: '1.1MB' },
  { url: '/data/songs.json', priority: 'high', size: '804KB' },
  { url: '/data/song-statistics.json', priority: 'high', size: '653KB' },
  { url: '/data/setlist-entries.json', priority: 'low', size: '21MB' },
  { url: '/data/guests.json', priority: 'medium', size: '196KB' },
  { url: '/data/tours.json', priority: 'low', size: '7.7KB' }
];

/**
 * Initialize critical data caching
 * Called from service worker install event
 */
export async function initializeCriticalDataCache() {
  if (!('caches' in self)) {
    return; // No cache support
  }

  const cache = await caches.open(CACHE_NAME);
  const critical = DATA_FILES.filter(f => f.priority === 'critical');

  console.log(`[DataCache] Caching ${critical.length} critical files...`);

  for (const file of critical) {
    try {
      const response = await fetch(file.url);
      if (response.ok) {
        await cache.put(file.url, response);
        console.log(`[DataCache] Cached ${file.url} (${file.size})`);
      }
    } catch (error) {
      console.warn(`[DataCache] Failed to cache ${file.url}:`, error);
    }
  }
}

/**
 * Background sync for non-critical data
 * Uses requestIdleCallback to avoid blocking user interaction
 */
export function prefetchBackgroundData() {
  if (typeof requestIdleCallback !== 'undefined' && 'caches' in self) {
    requestIdleCallback(() => {
      backgroundCacheData();
    });
  } else if (typeof setTimeout === 'function') {
    // Fallback: after 5 seconds
    setTimeout(() => {
      backgroundCacheData();
    }, 5000);
  }
}

async function backgroundCacheData() {
  if (!('caches' in self)) return;

  const cache = await caches.open(CACHE_NAME);
  const highPriority = DATA_FILES.filter(f =>
    f.priority === 'high' || f.priority === 'medium'
  );

  for (const file of highPriority) {
    try {
      const response = await fetch(file.url);
      if (response.ok) {
        await cache.put(file.url, response);
        console.log(`[DataCache-Background] Cached ${file.url}`);
      }
    } catch (error) {
      // Silently fail - we're in background
    }
  }
}

/**
 * Cache strategy for data requests
 * Use in service worker fetch handler
 */
export async function getDataFromCache(url: string) {
  if (!('caches' in self)) {
    return null;
  }

  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(url);

  if (response) {
    console.log(`[DataCache] Served from cache: ${url}`);
    return response;
  }

  // Not in cache yet - fetch and cache for next time
  try {
    const fetchResponse = await fetch(url);
    if (fetchResponse.ok) {
      await cache.put(url, fetchResponse.clone());
      console.log(`[DataCache] Cached on first request: ${url}`);
    }
    return fetchResponse;
  } catch (error) {
    console.error(`[DataCache] Failed to fetch ${url}:`, error);
    return null;
  }
}

/**
 * Cleanup old cache versions
 * Call from service worker activate event
 */
export async function cleanupOldCaches() {
  if (!('caches' in self)) return;

  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name =>
    name.startsWith('dmb-data-') && name !== CACHE_NAME
  );

  for (const cacheName of oldCaches) {
    console.log(`[DataCache] Deleting old cache: ${cacheName}`);
    await caches.delete(cacheName);
  }
}
```

**Usage in service worker (static/sw.js):**

```typescript
import {
  initializeCriticalDataCache,
  prefetchBackgroundData,
  cleanupOldCaches
} from '../src/lib/pwa/data-cache';

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await initializeCriticalDataCache();
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();
      // Prefetch remaining data in background
      prefetchBackgroundData();
      await clients.claim();
    })()
  );
});
```

---

## 8. GitHub Actions Bundle Size Check

**Create file:** `.github/workflows/bundle-check.yml`

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Check bundle size
        run: |
          # Calculate sizes
          TOTAL_SIZE=$(du -sb .svelte-kit/output/client | awk '{print $1}')
          TOTAL_MB=$((TOTAL_SIZE / 1024 / 1024))

          # Limits
          LIMIT_MB=7

          echo "Bundle Size Check"
          echo "=================="
          echo "Total: ${TOTAL_MB}MB"
          echo "Limit: ${LIMIT_MB}MB"

          # Fail if exceeds
          if [ $TOTAL_MB -gt $LIMIT_MB ]; then
            echo "❌ FAILED: Bundle size exceeds ${LIMIT_MB}MB limit!"
            exit 1
          fi

          echo "✅ PASSED: Bundle within limits"

      - name: Comment PR with bundle info
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');

            // Read bundle report if available
            const reportPath = '.svelte-kit/output/client/bundle-report.html';
            const hasReport = fs.existsSync(reportPath);

            const comment = `## Bundle Size Check
            ${hasReport ? '✅ Full report available in artifacts' : '📊 Run with ANALYZE=true for detailed report'}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

## Setup Instructions

**Run these commands in order:**

```bash
# 1. Install new dependencies
npm install --save-dev rollup-plugin-visualizer vite-plugin-compression

# 2. Remove extraneous packages
npm uninstall d3-scale-chromatic @types/d3-scale-chromatic @types/d3-array @types/d3-transition

# 3. Test the new configuration
npm run build

# 4. View bundle analysis
open dist/bundle-report.html

# 5. Verify console logs were removed
grep -r "console\." .svelte-kit/output/client/assets/*.js | wc -l
# Should be 0 or minimal

# 6. Check bundle size
du -sh .svelte-kit/output/client/
```

---

## Quick Verification Commands

```bash
# View build output with sizes
npm run build 2>&1 | grep -E "\.js|\.wasm|Total"

# Check chunk sizes
ls -lh .svelte-kit/output/client/assets/ | grep -E "\.js$"

# View bundle report
ANALYZE=true npm run build && open dist/bundle-report.html

# Test in production mode
npm run preview
# Then Ctrl+Shift+J in browser to check Network tab

# Verify no console logs in production
grep -r "console\." .svelte-kit/output/client/assets/*.js || echo "No console found ✓"
```

---

## Expected Changes After Implementation

**Before:**
```
dist/assets/_app-*.js:    ~150KB
dist/assets/d3-*.js:      ~60KB (across multiple files)
dist/bundle-report.html:  Not available
Build size warning:       None
Console logs:             ~5KB
```

**After:**
```
dist/assets/_app-*.js:       ~130KB (console removed)
dist/assets/d3-core-*.js:    ~20KB (proper chunking)
dist/assets/d3-force-*.js:   ~18KB
dist/assets/d3-geo-*.js:     ~12KB
dist/assets/d3-sankey-*.js:  ~6KB
dist/bundle-report.html:     Interactive visualization
Build warnings:              Shows chunks > 500KB
Console logs:                Removed
Compression:                 .gz and .br versions
```

**Total savings: 35-45KB gzip**

---

For more detailed optimization strategies, see:
- `BUNDLE_OPTIMIZATION_AUDIT.md` - Comprehensive reference
- `QUICK_WIN_IMPLEMENTATION.md` - Step-by-step guide
- `BUNDLE_OPTIMIZATION_SUMMARY.txt` - Executive overview
