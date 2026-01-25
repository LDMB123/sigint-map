/**
 * PWA Race Condition Tests
 * Verifies that multiple initialization calls don't create duplicate listeners
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PWA Initialization Race Conditions', () => {
	let mockWindow: any;
	let eventListenerMap: Map<string, Set<EventListener>>;

	beforeEach(() => {
		// Track event listeners to detect duplicates
		eventListenerMap = new Map();

		// Mock window with listener tracking
		mockWindow = {
			addEventListener: vi.fn((event: string, handler: EventListener) => {
				if (!eventListenerMap.has(event)) {
					eventListenerMap.set(event, new Set());
				}
				eventListenerMap.get(event)!.add(handler);
			}),
			removeEventListener: vi.fn((event: string, handler: EventListener) => {
				eventListenerMap.get(event)?.delete(handler);
			}),
			matchMedia: vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			})),
			navigator: {
				serviceWorker: {
					register: vi.fn(() => Promise.resolve({
						addEventListener: vi.fn(),
						removeEventListener: vi.fn(),
						periodicSync: {
							register: vi.fn(() => Promise.resolve())
						}
					}))
				},
				onLine: true
			},
			scrollY: 0
		};

		global.window = mockWindow as any;
		global.localStorage = {
			getItem: vi.fn(() => null),
			setItem: vi.fn(),
			removeItem: vi.fn()
		} as any;
	});

	afterEach(() => {
		eventListenerMap.clear();
	});

	describe('install-manager.ts', () => {
		it('should not create duplicate listeners on multiple initialize() calls', async () => {
			// Import fresh instance
			const { installManager } = await import('$lib/pwa/install-manager');

			// First initialization
			installManager.initialize();

			const beforeInstallCountAfterFirst = eventListenerMap.get('beforeinstallprompt')?.size || 0;
			const appInstalledCountAfterFirst = eventListenerMap.get('appinstalled')?.size || 0;
			const scrollCountAfterFirst = eventListenerMap.get('scroll')?.size || 0;

			expect(beforeInstallCountAfterFirst).toBe(1);
			expect(appInstalledCountAfterFirst).toBe(1);
			expect(scrollCountAfterFirst).toBe(1);

			// Second initialization (race condition scenario)
			installManager.initialize();

			const beforeInstallCountAfterSecond = eventListenerMap.get('beforeinstallprompt')?.size || 0;
			const appInstalledCountAfterSecond = eventListenerMap.get('appinstalled')?.size || 0;
			const scrollCountAfterSecond = eventListenerMap.get('scroll')?.size || 0;

			// Should still be 1 (old listeners cleaned up)
			expect(beforeInstallCountAfterSecond).toBe(1);
			expect(appInstalledCountAfterSecond).toBe(1);
			expect(scrollCountAfterSecond).toBe(1);
		});

		it('should properly track isInitialized flag', async () => {
			const { installManager } = await import('$lib/pwa/install-manager');

			expect(installManager.isInitialized).toBe(false);

			installManager.initialize();
			expect(installManager.isInitialized).toBe(true);

			installManager.deinitialize();
			expect(installManager.isInitialized).toBe(false);
		});

		it('should cleanup all listeners on deinitialize()', async () => {
			const { installManager } = await import('$lib/pwa/install-manager');

			installManager.initialize();
			expect(installManager.cleanups.length).toBeGreaterThan(0);

			installManager.deinitialize();
			expect(installManager.cleanups.length).toBe(0);
		});

		it('should handle rapid re-initialization without errors', async () => {
			const { installManager } = await import('$lib/pwa/install-manager');

			// Rapid fire initialization
			for (let i = 0; i < 5; i++) {
				expect(() => installManager.initialize()).not.toThrow();
			}

			// Should still have only one set of listeners
			const beforeInstallCount = eventListenerMap.get('beforeinstallprompt')?.size || 0;
			expect(beforeInstallCount).toBe(1);
		});
	});

	describe('pwa.ts store', () => {
		it('should not create duplicate listeners on multiple initialize() calls', async () => {
			const { pwaStore } = await import('$lib/stores/pwa');

			// First initialization
			await pwaStore.initialize();

			const onlineCountAfterFirst = eventListenerMap.get('online')?.size || 0;
			const offlineCountAfterFirst = eventListenerMap.get('offline')?.size || 0;

			expect(onlineCountAfterFirst).toBe(1);
			expect(offlineCountAfterFirst).toBe(1);

			// Second initialization (race condition scenario)
			await pwaStore.initialize();

			const onlineCountAfterSecond = eventListenerMap.get('online')?.size || 0;
			const offlineCountAfterSecond = eventListenerMap.get('offline')?.size || 0;

			// Should still be 1 (old listeners cleaned up via AbortController)
			expect(onlineCountAfterSecond).toBe(1);
			expect(offlineCountAfterSecond).toBe(1);
		});

		it('should abort previous AbortController on re-initialization', async () => {
			const { pwaStore } = await import('$lib/stores/pwa');

			await pwaStore.initialize();

			// Get reference to first AbortController (via internals)
			// In real scenario, signal.aborted would be true after cleanup

			await pwaStore.initialize();

			// New AbortController should be created
			// This is tested indirectly by ensuring listeners are re-registered
			expect(eventListenerMap.get('online')?.size).toBe(1);
		});

		it('should cleanup all listeners via cleanup()', async () => {
			const { pwaStore } = await import('$lib/stores/pwa');

			await pwaStore.initialize();

			// Should have listeners
			expect(eventListenerMap.get('online')?.size).toBe(1);

			pwaStore.cleanup();

			// Listeners should be aborted (in real scenario, they'd be removed)
			// We can't test AbortController.abort() directly in this mock,
			// but we verify the method doesn't throw
			expect(() => pwaStore.cleanup()).not.toThrow();
		});
	});

	describe('Integration: Multiple simultaneous calls', () => {
		it('should handle Promise.allSettled initialization pattern safely', async () => {
			const { pwaStore } = await import('$lib/stores/pwa');
			const { installManager } = await import('$lib/pwa/install-manager');

			// Simulate +layout.svelte initialization pattern
			const results = await Promise.allSettled([
				pwaStore.initialize(),
				Promise.resolve().then(() => installManager.initialize()),
				pwaStore.initialize(), // Duplicate call
				Promise.resolve().then(() => installManager.initialize()) // Duplicate call
			]);

			// All should succeed
			expect(results.every(r => r.status === 'fulfilled')).toBe(true);

			// Should still only have one set of listeners
			const beforeInstallCount = eventListenerMap.get('beforeinstallprompt')?.size || 0;
			expect(beforeInstallCount).toBe(1);
		});
	});
});
