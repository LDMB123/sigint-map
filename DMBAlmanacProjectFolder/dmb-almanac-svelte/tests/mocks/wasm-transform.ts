/**
 * Mock for dmb-transform WASM module
 * Used in tests when WASM packages aren't built
 */

export default async function init() {
	return undefined;
}

export function version(): string {
	return 'mock-1.0.0';
}

export function transform_songs(data: unknown[]): unknown[] {
	return data;
}

export function transform_venues(data: unknown[]): unknown[] {
	return data;
}

export function transform_shows(data: unknown[]): unknown[] {
	return data;
}

export function transform_tours(data: unknown[]): unknown[] {
	return data;
}

export function transform_setlist_entries(data: unknown[]): unknown[] {
	return data;
}

export function validate_foreign_keys(): unknown[] {
	return [];
}

export function generate_song_search_text(title: string, originalArtist: string | null): string {
	return originalArtist ? `${title} ${originalArtist}` : title;
}

export function generate_venue_search_text(name: string, city: string, state: string, country: string): string {
	return [name, city, state, country].filter(Boolean).join(' ');
}
