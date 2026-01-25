/**
 * Data Store - Svelte 5 store for data loading state management
 *
 * Replaces React's DataProvider context
 * Manages IndexedDB initialization and data loading progress
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Types
export type DataPhase = 'idle' | 'checking' | 'fetching' | 'loading' | 'complete' | 'error';

export interface LoadProgress {
	phase: DataPhase;
	entity?: string;
	loaded: number;
	total: number;
	percentage: number;
	error?: string;
}

export interface DataState {
	status: 'loading' | 'ready' | 'error';
	progress: LoadProgress;
}

// Initial state
const initialProgress: LoadProgress = {
	phase: 'idle',
	loaded: 0,
	total: 0,
	percentage: 0
};

// Create stores
const status = writable<'loading' | 'ready' | 'error'>('loading');
const progress = writable<LoadProgress>(initialProgress);

// Combined state
export const dataState = derived([status, progress], ([$status, $progress]) => ({
	status: $status,
	progress: $progress
}));

// Export store
export const dataStore = {
	status: { subscribe: status.subscribe },
	progress: { subscribe: progress.subscribe },

	/**
	 * Initialize data loading
	 */
	async initialize() {
		if (!browser) {
			console.debug('[DataStore] Skipping initialization: not in browser');
			return;
		}

		console.debug('[DataStore] Starting initialization...');

		try {
			// Dynamic import of data loader to reduce initial bundle
			console.debug('[DataStore] Importing data-loader module...');
			const { loadInitialData, isDataLoaded } = await import('$db/dexie/data-loader');
			console.debug('[DataStore] data-loader module imported successfully');

			// Check if data already exists
			console.debug('[DataStore] Checking if data is already loaded...');
			const dataExists = await isDataLoaded();
			console.debug('[DataStore] Data exists check result:', dataExists);

			if (dataExists) {
				// Data already loaded
				console.debug('[DataStore] Data already loaded, setting ready state');
				progress.set({
					phase: 'complete',
					loaded: 100,
					total: 100,
					percentage: 100
				});
				status.set('ready');
				return;
			}

			// Load data from static JSON files with progress updates
			console.debug('[DataStore] Starting loadInitialData...');
			await loadInitialData((loadProgress) => {
				console.debug('[DataStore] Progress update:', loadProgress.phase, loadProgress.percentage.toFixed(1) + '%');
				progress.set(loadProgress);
			});

			console.debug('[DataStore] loadInitialData completed successfully');
			status.set('ready');
		} catch (error) {
			console.error('[DataStore] Initialization failed:', error);
			progress.set({
				phase: 'error',
				loaded: 0,
				total: 0,
				percentage: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			status.set('error');
		}
	},

	/**
	 * Retry data loading
	 */
	async retry() {
		status.set('loading');
		await this.initialize();
	},

	/**
	 * Check if data is ready
	 */
	isReady(): boolean {
		return get(status) === 'ready';
	}
};
