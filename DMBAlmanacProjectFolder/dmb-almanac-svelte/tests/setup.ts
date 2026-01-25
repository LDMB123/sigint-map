/**
 * Vitest setup file
 * - Imports custom matchers for DOM testing
 * - Mocks WASM modules that may not be built
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock WASM modules that may not be built in test environment
// These modules are expected at $wasm/dmb-transform/pkg/dmb_transform.js etc.
vi.mock('$wasm/dmb-transform/pkg/dmb_transform.js', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	version: vi.fn().mockReturnValue('mock-1.0.0'),
	transform_songs: vi.fn().mockReturnValue([]),
	transform_venues: vi.fn().mockReturnValue([]),
	transform_shows: vi.fn().mockReturnValue([]),
	transform_tours: vi.fn().mockReturnValue([]),
	transform_setlist_entries: vi.fn().mockReturnValue([]),
	validate_foreign_keys: vi.fn().mockReturnValue([]),
	generate_song_search_text: vi.fn().mockReturnValue(''),
	generate_venue_search_text: vi.fn().mockReturnValue(''),
}));

vi.mock('$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	version: vi.fn().mockReturnValue('mock-1.0.0'),
}));

vi.mock('$wasm/dmb-date-utils/pkg/dmb_date_utils.js', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	version: vi.fn().mockReturnValue('mock-1.0.0'),
}));

vi.mock('$wasm/dmb-string-utils/pkg/dmb_string_utils.js', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	version: vi.fn().mockReturnValue('mock-1.0.0'),
}));

vi.mock('$wasm/dmb-core/pkg/dmb_core.js', () => ({
	default: vi.fn().mockResolvedValue(undefined),
	version: vi.fn().mockReturnValue('mock-1.0.0'),
}));
