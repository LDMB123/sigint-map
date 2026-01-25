import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

/** @type {import('eslint').Linter.Config[]} */
export default [
	// Global ignores
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'build/**',
			'dist/**',
			'wasm/**/target/**',
			'wasm/**/pkg/**',
			'scraper/**',
			'scripts/**',
			'docs/**',
			'data/**',
			'.claude/**',
			'static/**',
			'*.config.js',
			'*.config.ts',
			'INTEGRATION_EXAMPLE.svelte'
		]
	},

	// Base JavaScript configuration
	js.configs.recommended,

	// TypeScript configuration (using recommended, not type-checked which is too strict)
	...ts.configs.recommended,
	{
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			},
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				// Browser globals
				window: 'readonly',
				document: 'readonly',
				navigator: 'readonly',
				console: 'readonly',
				setTimeout: 'readonly',
				clearTimeout: 'readonly',
				setInterval: 'readonly',
				clearInterval: 'readonly',
				requestAnimationFrame: 'readonly',
				cancelAnimationFrame: 'readonly',
				requestIdleCallback: 'readonly',
				cancelIdleCallback: 'readonly',
				performance: 'readonly',
				IntersectionObserver: 'readonly',
				ResizeObserver: 'readonly',
				MutationObserver: 'readonly',
				CustomEvent: 'readonly',
				Event: 'readonly',
				HTMLElement: 'readonly',
				Element: 'readonly',
				Node: 'readonly',
				NodeList: 'readonly',
				fetch: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				AbortController: 'readonly',
				AbortSignal: 'readonly',
				Headers: 'readonly',
				Request: 'readonly',
				Response: 'readonly',
				FormData: 'readonly',
				Blob: 'readonly',
				File: 'readonly',
				FileReader: 'readonly',
				Worker: 'readonly',
				MessageChannel: 'readonly',
				MessagePort: 'readonly',
				location: 'readonly',
				history: 'readonly',
				localStorage: 'readonly',
				sessionStorage: 'readonly',
				indexedDB: 'readonly',
				crypto: 'readonly',
				Math: 'readonly',
				Date: 'readonly',
				JSON: 'readonly',
				Map: 'readonly',
				Set: 'readonly',
				WeakMap: 'readonly',
				WeakSet: 'readonly',
				Promise: 'readonly',
				Proxy: 'readonly',
				Reflect: 'readonly',
				Symbol: 'readonly',
				ArrayBuffer: 'readonly',
				DataView: 'readonly',
				Int8Array: 'readonly',
				Uint8Array: 'readonly',
				Int16Array: 'readonly',
				Uint16Array: 'readonly',
				Int32Array: 'readonly',
				Uint32Array: 'readonly',
				Float32Array: 'readonly',
				Float64Array: 'readonly',
				BigInt: 'readonly',
				BigInt64Array: 'readonly',
				BigUint64Array: 'readonly',
				TextEncoder: 'readonly',
				TextDecoder: 'readonly',
				atob: 'readonly',
				btoa: 'readonly',
				queueMicrotask: 'readonly',
				structuredClone: 'readonly',
				CSS: 'readonly',
				caches: 'readonly',
				alert: 'readonly',
				confirm: 'readonly',
				prompt: 'readonly',
				getComputedStyle: 'readonly',
				matchMedia: 'readonly',
				addEventListener: 'readonly',
				removeEventListener: 'readonly',
				dispatchEvent: 'readonly',
				Image: 'readonly',
				Audio: 'readonly',
				Option: 'readonly',
				XMLHttpRequest: 'readonly',
				WebSocket: 'readonly',
				EventSource: 'readonly',
				MutationObserver: 'readonly',
				PerformanceObserver: 'readonly',
				// Geospatial and D3 types
				GeoJSON: 'readonly',
				GeolocationPosition: 'readonly',
				GeolocationPositionError: 'readonly',
				// Web APIs
				Notification: 'readonly',
				ServiceWorker: 'readonly',
				ServiceWorkerRegistration: 'readonly',
				Cache: 'readonly',
				CacheStorage: 'readonly',
				IDBDatabase: 'readonly',
				IDBTransaction: 'readonly',
				BroadcastChannel: 'readonly',
				// Svelte 5 generics placeholder
				T: 'readonly'
			}
		},
		rules: {
			// TypeScript specific rules - warn on unused vars, allow many patterns
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_|^tx$|^ptr$|^len$|^options$|^headers$|^error$|^e$|^err$',
					varsIgnorePattern: '^_|^\\$\\$|^browser$|^get$|^Writable$|^Observable$|^DEFAULT_',
					caughtErrorsIgnorePattern: '^_|^error$|^e$|^err$'
				}
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			// Dynamic imports are common in SvelteKit
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			// Allow floating promises (common in SvelteKit event handlers)
			'@typescript-eslint/no-floating-promises': 'off'
		}
	},

	// Svelte configuration
	...svelte.configs['flat/recommended'],
	{
		files: ['src/**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte']
			}
		},
		rules: {
			// Svelte 5 specific rules
			'svelte/valid-compile': ['error', { ignoreWarnings: true }],
			'svelte/no-unused-svelte-ignore': 'warn',
			'svelte/no-reactive-reassign': 'error',
			'svelte/require-store-reactive-access': 'error',

			// Accessibility rules
			'svelte/no-at-html-tags': 'warn',
			'svelte/no-target-blank': 'error',

			// Style rules
			// Note: svelte/indent disabled due to stack overflow bug with complex files
			'svelte/indent': 'off',
			'svelte/html-quotes': ['error', { prefer: 'double' }],
			'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
			'svelte/mustache-spacing': ['error', { textExpressions: 'never', tags: { openingBrace: 'never', closingBrace: 'never' } }],
			'svelte/shorthand-attribute': ['error', { prefer: 'always' }],
			'svelte/shorthand-directive': ['error', { prefer: 'always' }],
			'svelte/spaced-html-comment': ['error', 'always'],

			// TypeScript in Svelte
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_|^\\$\\$(Props|Events|Slots)',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},

	// TypeScript in Svelte files - additional config
	{
		files: ['src/**/*.svelte'],
		rules: {
			// Relax some TypeScript rules for Svelte files
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			// Svelte reactivity patterns use let, not const
			'prefer-const': 'off',
			// These don't work well with Svelte's type inference
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/require-await': 'off',
			// Allow dynamic imports in Svelte
			'@typescript-eslint/consistent-type-imports': 'off',
			// Allow type aliases (not just interfaces)
			'@typescript-eslint/consistent-type-definitions': 'off',
			// Type assertions are sometimes needed
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			// Allow floating promises in Svelte event handlers and effects
			'@typescript-eslint/no-floating-promises': 'off',
			// Disable no-misused-promises for Svelte
			'@typescript-eslint/no-misused-promises': 'off',
			// Allow unused vars that start with underscore or are Svelte props/events/slots
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_|^\\$\\$(Props|Events|Slots)|^page$|^data$',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},

	// Server-side files (relax some rules)
	{
		files: ['src/**/*.server.ts', 'src/hooks.server.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn'
		}
	},

	// General code quality rules for TypeScript files
	{
		files: ['src/**/*.ts'],
		rules: {
			// Best practices
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'warn',
			'prefer-const': 'error',
			'no-var': 'error',
			'no-case-declarations': 'off',  // Allow declarations in case blocks
			'eqeqeq': ['error', 'always', { null: 'ignore' }],
			'curly': ['error', 'multi-line', 'consistent'],
			'no-throw-literal': 'error',
			'prefer-promise-reject-errors': 'error',

			// Code style
			'quotes': ['error', 'single', { avoidEscape: true }],
			'semi': ['error', 'always'],
			'comma-dangle': ['error', 'only-multiline'],
			'object-shorthand': ['error', 'always'],
			'arrow-body-style': ['error', 'as-needed']
		}
	},

	// General code quality rules for Svelte files (with prefer-const disabled)
	{
		files: ['src/**/*.svelte'],
		rules: {
			// Best practices - relaxed for Svelte
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'warn',
			'prefer-const': 'off',  // Svelte props use let
			'no-var': 'error',
			'no-case-declarations': 'off',  // Allow declarations in case blocks
			'eqeqeq': ['error', 'always', { null: 'ignore' }],
			'curly': ['error', 'multi-line', 'consistent'],
			'no-throw-literal': 'error',
			'prefer-promise-reject-errors': 'error',

			// Code style
			'quotes': 'off',  // Svelte has its own quote handling
			'semi': 'off',    // Svelte files may have different style
			'comma-dangle': ['error', 'only-multiline'],
			'object-shorthand': ['error', 'always'],
			'arrow-body-style': ['error', 'as-needed']
		}
	}
];
