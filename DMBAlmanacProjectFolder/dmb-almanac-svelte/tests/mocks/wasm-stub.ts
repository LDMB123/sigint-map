/**
 * Generic stub for WASM modules
 * Used in tests when WASM packages aren't built
 */

export default async function init() {
	return undefined;
}

export function version(): string {
	return 'mock-1.0.0';
}
