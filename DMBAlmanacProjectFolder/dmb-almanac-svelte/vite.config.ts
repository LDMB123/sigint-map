import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Generate build version and hash
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const BUILD_VERSION = pkg.version;
const BUILD_HASH = (() => {
	try {
		return execSync('git rev-parse --short HEAD', { stdio: 'ignore' }).toString().trim();
	} catch {
		return 'dev';
	}
})();
const BUILD_TIMESTAMP = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 12);

export default defineConfig(({ mode }) => ({
	plugins: [
		wasm(),
		topLevelAwait(),
		sveltekit()
	],
	// Resolve aliases for production and test modes
	resolve: {
		alias: {
			// WASM packages: map $wasm alias to root wasm directory
			'$wasm/dmb-transform/pkg': '/wasm/dmb-transform/pkg',
			'$wasm/dmb-segue-analysis/pkg': '/wasm/dmb-segue-analysis/pkg',
			'$wasm/dmb-date-utils/pkg': '/wasm/dmb-date-utils/pkg',
			'$wasm/dmb-string-utils/pkg': '/wasm/dmb-string-utils/pkg',
			'$wasm/dmb-core/pkg': '/wasm/dmb-core/pkg',
			'$wasm/dmb-force-simulation/pkg': '/wasm/dmb-force-simulation/pkg',
			'$wasm/dmb-visualize/pkg': '/wasm/dmb-visualize/pkg',
			// Test mode WASM mocks
			...(mode === 'test' && {
				'$wasm/dmb-transform/pkg/dmb_transform.js': '/tests/mocks/wasm-transform.ts',
				'$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js': '/tests/mocks/wasm-stub.ts',
				'$wasm/dmb-date-utils/pkg/dmb_date_utils.js': '/tests/mocks/wasm-stub.ts',
				'$wasm/dmb-string-utils/pkg/dmb_string_utils.js': '/tests/mocks/wasm-stub.ts',
				'$wasm/dmb-core/pkg/dmb_core.js': '/tests/mocks/wasm-stub.ts',
				'$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js': '/tests/mocks/wasm-stub.ts'
			})
		}
	},
	// Inject build-time constants for service worker and app
	define: {
		__BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
		__APP_VERSION__: JSON.stringify(BUILD_VERSION),
		__BUILD_HASH__: JSON.stringify(BUILD_HASH),
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		// Explicit include/exclude for test safety
		include: ['tests/**/*.test.ts'],
		// Exclude: node_modules, old src tests, WASM tests (require Rust build), PWA race tests (need window mock refactor)
		exclude: [
			'node_modules',
			'src/**/*.test.ts',
			'tests/unit/wasm/transform.test.ts',
			'tests/pwa-race-conditions.test.ts'
		],
		// Resolve $lib and other aliases for tests outside src/
		alias: {
			$lib: '/src/lib',
			$components: '/src/lib/components',
			$stores: '/src/lib/stores',
			$db: '/src/lib/db',
			$wasm: '/wasm',
			// Mock WASM packages that aren't built in test environment
			'$wasm/dmb-transform/pkg/dmb_transform.js': '/tests/mocks/wasm-transform.ts',
			'$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js': '/tests/mocks/wasm-stub.ts',
			'$wasm/dmb-date-utils/pkg/dmb_date_utils.js': '/tests/mocks/wasm-stub.ts',
			'$wasm/dmb-string-utils/pkg/dmb_string_utils.js': '/tests/mocks/wasm-stub.ts',
			'$wasm/dmb-core/pkg/dmb_core.js': '/tests/mocks/wasm-stub.ts',
			'$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js': '/tests/mocks/wasm-stub.ts'
		}
	},
	optimizeDeps: {
		include: ['dexie'],
		// Exclude WASM packages from dependency optimization
		exclude: ['dmb-transform', 'dmb-segue-analysis', 'dmb-date-utils']
	},
	build: {
		target: 'es2022',
		// Enable Brotli compression for production builds
		reportCompressedSize: true,
		rollupOptions: {
			output: {
				// Aggressive manual chunking for maximum lazy loading potential
				// Each visualization can load its D3 dependencies independently
				manualChunks(id) {
					// Skip external modules (SSR build marks dependencies as external)
					if (id.includes('node_modules')) {
						// D3 Core: selection + scale (used by all visualizations)
						// ~23KB gzipped - loaded initially or with first visualization
						if (id.includes('d3-selection') || id.includes('d3-scale')) {
							return 'd3-core';
						}

						// D3 Axis: only for charts with axes (Timeline, Heatmap, Rarity)
						// ~5KB gzipped - lazy loaded with axis-based visualizations
						if (id.includes('d3-axis')) {
							return 'd3-axis';
						}

						// D3 Sankey: TransitionFlow visualization ONLY
						// ~8KB gzipped - lazy loaded only when user views transitions
						if (id.includes('d3-sankey')) {
							return 'd3-sankey';
						}

						// D3 Force + Drag: GuestNetwork visualization ONLY
						// ~25KB gzipped together - lazy loaded only when user views guest network
						if (id.includes('d3-force') || id.includes('d3-drag')) {
							return 'd3-force-interactive';
						}

						// D3 Geo: TourMap visualization ONLY
						// ~16KB gzipped - lazy loaded only when user views tour map
						if (id.includes('d3-geo')) {
							return 'd3-geo';
						}

						// Dexie: IndexedDB wrapper (loaded early for offline data)
						if (id.includes('dexie')) {
							return 'dexie';
						}

						// TopJSON: GeoJSON/TopoJSON support (with d3-geo)
						if (id.includes('topojson-client')) {
							return 'd3-geo';
						}
					}
				},
				assetFileNames: (assetInfo) => {
					if (assetInfo.name?.endsWith('.wasm')) {
						return 'wasm/[name]-[hash][extname]';
					}
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
		// Chunk size warning limits
		// D3 chunks are expected to be large since they're feature-complete libraries
		chunkSizeWarningLimit: 50, // Warn on chunks > 50KB (d3 modules will exceed this)
	},
	// Apple Silicon optimized settings
	server: {
		fs: {
			allow: ['..']
		}
	}
}));
