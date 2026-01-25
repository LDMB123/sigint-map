import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * Protocol Handler for PWA - Processes web+dmb:// URLs
 *
 * Supported formats:
 * - web+dmb://show/1991-03-23
 * - web+dmb://song/ants-marching
 * - web+dmb://venue/123
 * - web+dmb://search?q=phish
 *
 * The protocol URL is passed via URL search param `url=<encoded-url>`
 * This page parses and redirects to the appropriate internal route.
 *
 * SECURITY: Validates protocol, whitelists routes, prevents path traversal
 */

// Whitelist of allowed route prefixes to prevent open redirects
const ALLOWED_ROUTES = ['/shows/', '/songs/', '/venues/', '/search', '/guests/', '/tours/'] as const;

/**
 * Validates that a route is safe and whitelisted
 * Prevents open redirect and path traversal attacks
 */
function isAllowedRoute(route: string): boolean {
	// Must start with allowed route prefix
	if (!ALLOWED_ROUTES.some(allowed => route.startsWith(allowed))) {
		return false;
	}

	// Prevent path traversal attempts
	if (route.includes('..') || route.includes('//') || route.includes('\\')) {
		return false;
	}

	// Prevent protocol injection
	if (route.includes(':') && !route.startsWith('/')) {
		return false;
	}

	// Must be relative path
	if (!route.startsWith('/')) {
		return false;
	}

	return true;
}

/**
 * Sanitizes identifier to prevent injection attacks
 */
function sanitizeIdentifier(identifier: string): string {
	// Remove any null bytes
	let clean = identifier.replace(/\0/g, '');

	// Remove path traversal sequences
	clean = clean.replace(/\.\./g, '');

	// Remove leading/trailing slashes and whitespace
	clean = clean.trim().replace(/^\/+|\/+$/g, '');

	return clean;
}

export const load: PageLoad = async ({ url }) => {
	// Check both 'uri' (from manifest) and 'url' (legacy/fallback)
	const protocolUrl = url.searchParams.get('uri') || url.searchParams.get('url');

	// If no URL, show waiting state
	if (!protocolUrl) {
		return {
			status: 'waiting',
			error: null
		};
	}

	try {
		// Decode the URL parameter (in case it's encoded)
		let decodedUrl = protocolUrl;
		try {
			decodedUrl = decodeURIComponent(protocolUrl);
		} catch {
			// Already decoded or not encoded, use as-is
		}

		// SECURITY: Validate protocol prefix to prevent protocol injection
		if (!decodedUrl.startsWith('web+dmb://')) {
			return {
				status: 'invalid_protocol',
				error: 'Invalid protocol. Only web+dmb:// URLs are allowed.',
				url: decodedUrl
			};
		}

		// Parse the protocol URL
		// Format: web+dmb://resource/identifier or web+dmb://resource?params
		const cleanUrl = decodedUrl.replace(/^web\+dmb:\/\//, '');

		// SECURITY: Check for suspicious patterns before processing
		if (cleanUrl.includes('..') || cleanUrl.includes('//') || cleanUrl.includes('\\')) {
			return {
				status: 'invalid_format',
				error: 'Invalid URL format detected (path traversal attempt)',
				url: decodedUrl
			};
		}

		// Split into parts: resource/identifier or resource?query
		const [resource, ...rest] = cleanUrl.split('/');
		const identifier = rest.join('/');
		const queryMatch = identifier?.match(/^([^?]+)(?:\?(.+))?$/);
		const id = sanitizeIdentifier(queryMatch?.[1] || identifier);
		const queryString = queryMatch?.[2];

		// Route based on resource type
		switch (resource?.toLowerCase()) {
			case 'show': {
				// Show date format: YYYY-MM-DD
				if (id && /^\d{4}-\d{2}-\d{2}$/.test(id)) {
					const targetRoute = `/shows/${id}`;
					// SECURITY: Validate route before redirecting
					if (isAllowedRoute(targetRoute)) {
						redirect(302, targetRoute);
					}
				}
				break;
			}

			case 'song': {
				// Song slug format: lowercase-with-hyphens (alphanumeric and hyphens only)
				if (id && /^[a-z0-9-]+$/i.test(id) && id.length > 0 && id.length <= 200) {
					const targetRoute = `/songs/${id}`;
					// SECURITY: Validate route before redirecting
					if (isAllowedRoute(targetRoute)) {
						redirect(302, targetRoute);
					}
				}
				break;
			}

			case 'venue': {
				// Venue ID format: numeric
				if (id && /^\d+$/.test(id) && id.length <= 20) {
					const targetRoute = `/venues/${id}`;
					// SECURITY: Validate route before redirecting
					if (isAllowedRoute(targetRoute)) {
						redirect(302, targetRoute);
					}
				}
				break;
			}

			case 'search': {
				// Search query: web+dmb://search/query-term
				// or web+dmb://search?q=query-term
				let query = id;
				if (queryString) {
					const params = new URLSearchParams(queryString);
					query = params.get('q') || query;
				}
				// SECURITY: Limit query length and sanitize
				if (query && query.length > 0 && query.length <= 200) {
					const targetRoute = `/search?q=${encodeURIComponent(query)}`;
					// SECURITY: Validate route before redirecting
					if (isAllowedRoute(targetRoute)) {
						redirect(302, targetRoute);
					}
				}
				break;
			}

			case 'guest': {
				// Guest musician ID format: numeric
				if (id && /^\d+$/.test(id) && id.length <= 20) {
					const targetRoute = `/guests/${id}`;
					// SECURITY: Validate route before redirecting
					if (isAllowedRoute(targetRoute)) {
						redirect(302, targetRoute);
					}
				}
				break;
			}

			case 'tour': {
				// Tour ID format: numeric
				if (id && /^\d+$/.test(id) && id.length <= 20) {
					const targetRoute = `/tours/${id}`;
					// SECURITY: Validate route before redirecting
					if (isAllowedRoute(targetRoute)) {
						redirect(302, targetRoute);
					}
				}
				break;
			}

			default: {
				// Unknown resource type
				return {
					status: 'invalid_format',
					error: `Unknown resource type: ${resource}`,
					url: decodedUrl
				};
			}
		}

		// If we reach here, the identifier was invalid for the resource type
		return {
			status: 'invalid_identifier',
			error: `Invalid identifier for resource: ${resource}`,
			url: decodedUrl,
			resource,
			identifier: id
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			status: 'error',
			error: `Failed to parse protocol URL: ${errorMessage}`,
			url: protocolUrl
		};
	}
};
