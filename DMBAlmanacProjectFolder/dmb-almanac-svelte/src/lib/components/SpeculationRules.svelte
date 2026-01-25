<script lang="ts">
	import { onMount } from 'svelte';
	import { isSpeculationRulesSupported, addSpeculationRules } from '$lib/utils/speculationRules';
	import type { SpeculationRulesConfig, SpeculationEagerness } from '$lib/utils/speculationRules';

	interface Props {
		/**
		 * Array of route patterns to prerender
		 * Example: ['/songs', '/tours', '/venues']
		 */
		prerenderRoutes?: string[];

		/**
		 * Array of route patterns to prefetch
		 * Example: ['/shows/*', '/guests/*']
		 */
		prefetchRoutes?: string[];

		/**
		 * Eagerness level for prerender routes
		 * - immediate: Start loading right away (use sparingly)
		 * - eager: Load when document becomes interactive
		 * - moderate: Load when user indicates intent (hover, focus)
		 * - conservative: Only load when explicitly requested
		 *
		 * Default: 'moderate'
		 */
		prerenderEagerness?: SpeculationEagerness;

		/**
		 * Eagerness level for prefetch routes
		 * Default: 'conservative'
		 */
		prefetchEagerness?: SpeculationEagerness;

		/**
		 * CSS selectors for elements whose links should be prerendered
		 * Example: ['.hero-link', '[data-prerender="true"]']
		 */
		prerenderSelectors?: string[];

		/**
		 * CSS selectors for elements whose links should be prefetched
		 * Example: ['nav a', '.navigation-link']
		 */
		prefetchSelectors?: string[];

		/**
		 * Enable detailed console logging (development only)
		 * Default: false
		 */
		debug?: boolean;
	}

	const {
		prerenderRoutes = [],
		prefetchRoutes = [],
		prerenderEagerness = 'moderate' as const,
		prefetchEagerness = 'conservative' as const,
		prerenderSelectors = [],
		prefetchSelectors = [],
		debug = false
	} = $props();

	let _isSupported = $state(false);
	let _isRendered = $state(false);
	let _speculationRulesHTML = $state('');

	// Build speculation rules HTML
	const buildSpeculationRulesHTML = () => {
		if (!_isSupported) return '';

		const prerenderRules = [];
		const prefetchRules = [];

		if (prerenderRoutes.length > 0) {
			prerenderRules.push({
				where: { href_matches: prerenderRoutes.length === 1 ? prerenderRoutes[0] : prerenderRoutes },
				eagerness: prerenderEagerness
			});
		}
		if (prerenderSelectors.length > 0) {
			prerenderRules.push({
				where: { selector_matches: prerenderSelectors.join(', ') },
				eagerness: prerenderEagerness
			});
		}

		if (prefetchRoutes.length > 0) {
			prefetchRules.push({
				where: { href_matches: prefetchRoutes.length === 1 ? prefetchRoutes[0] : prefetchRoutes },
				eagerness: prefetchEagerness
			});
		}
		if (prefetchSelectors.length > 0) {
			prefetchRules.push({
				where: { selector_matches: prefetchSelectors.join(', ') },
				eagerness: prefetchEagerness
			});
		}

		const rules = {
			prerender: prerenderRules,
			prefetch: prefetchRules
		};

		return '<script type="speculationrules">\n' + JSON.stringify(rules, null, 2) + '\n</' + 'script>';
	};

	onMount(() => {
		_isSupported = isSpeculationRulesSupported();
		_isRendered = true;
		_speculationRulesHTML = buildSpeculationRulesHTML();

		if (!_isSupported) {
			if (debug) {
				console.debug('[SpeculationRules.svelte] Speculation Rules API not supported');
			}
			return;
		}

		// Only add dynamic rules if we have custom routes/selectors
		if (prerenderRoutes.length > 0 || prefetchRoutes.length > 0 ||
			prerenderSelectors.length > 0 || prefetchSelectors.length > 0) {

			const config: SpeculationRulesConfig = {};

			// Build prerender rules
			if (prerenderRoutes.length > 0 || prerenderSelectors.length > 0) {
				config.prerender = [];

				if (prerenderRoutes.length > 0) {
					config.prerender.push({
						where: { href_matches: prerenderRoutes.length === 1 ? prerenderRoutes[0] : prerenderRoutes },
						eagerness: prerenderEagerness
					});
				}

				if (prerenderSelectors.length > 0) {
					config.prerender.push({
						where: { selector_matches: prerenderSelectors.join(', ') },
						eagerness: prerenderEagerness
					});
				}
			}

			// Build prefetch rules
			if (prefetchRoutes.length > 0 || prefetchSelectors.length > 0) {
				config.prefetch = [];

				if (prefetchRoutes.length > 0) {
					config.prefetch.push({
						where: { href_matches: prefetchRoutes.length === 1 ? prefetchRoutes[0] : prefetchRoutes },
						eagerness: prefetchEagerness
					});
				}

				if (prefetchSelectors.length > 0) {
					config.prefetch.push({
						where: { selector_matches: prefetchSelectors.join(', ') },
						eagerness: prefetchEagerness
					});
				}
			}

			// Only add if we have rules
			if (Object.keys(config).length > 0) {
				addSpeculationRules(config);

				if (debug) {
					console.debug('[SpeculationRules.svelte] Added dynamic rules:', config);
				}
			}
		}
	});
</script>

<!--
	Speculation Rules Component (Chromium 2025 / Chrome 109+)

	This component renders speculation rules for intelligent prefetching and prerendering.
	It can be used in two ways:

	1. Declarative via props (child routes with route-specific rules)
	2. Inline script tag in app.html (global rules - already implemented)

	Feature Detection:
	- Checks for native Speculation Rules API support
	- SSR-safe: only renders on client
	- Graceful degradation: does nothing if API not supported

	Example Usage in Routes:
	```svelte
	<script>
		import SpeculationRules from '$lib/components/SpeculationRules.svelte';
	</script>

	<SpeculationRules
		prerenderRoutes={['/songs/*']}
		prefetchSelectors={['.related-song-link']}
		prerenderEagerness="eager"
		debug={import.meta.env.DEV}
	/>
	```
-->

{#if _isRendered && _speculationRulesHTML}
	<!--
		Inline script tag for JSON-based speculation rules
		Only rendered if API is supported

		Security Note: The @html usage here is SAFE because:
		1. _speculationRulesHTML is built entirely from internal state via buildSpeculationRulesHTML()
		2. All props are strictly typed arrays of strings
		3. Content is JSON.stringify()'d which escapes any malicious content
		4. No user-controlled raw HTML is ever injected
	-->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: programmatically generated JSON, no user input -->
	{@html _speculationRulesHTML}
{/if}

<style>
	/* This component is rendering-less - it only injects script tags */
</style>
