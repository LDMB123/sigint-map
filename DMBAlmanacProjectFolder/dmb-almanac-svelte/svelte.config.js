import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Preprocess TypeScript and other preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		alias: {
			$components: 'src/lib/components',
			$stores: 'src/lib/stores',
			$db: 'src/lib/db',
			$lib: 'src/lib',
			$wasm: 'wasm'
		},
		// Manual service worker registration for PWA control
		serviceWorker: {
			register: false
		}
	}
};

export default config;
