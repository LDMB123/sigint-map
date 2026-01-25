import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * File Handler for PWA - Processes files launched via launchQueue
 *
 * Handles:
 * - .dmb: Concert data files (JSON format with show data)
 * - .setlist: Setlist export files (JSON format)
 * - .json: Generic concert data files (JSON format)
 *
 * The file is passed via URL search param `file=<base64-encoded-data>`
 * or via launchQueue (handled in +page.svelte)
 */

export const load: PageLoad = async ({ url }) => {
	const fileParam = url.searchParams.get('file');
	const fileType = url.searchParams.get('type');

	// If no file data, show loading state
	if (!fileParam || !fileType) {
		return {
			status: 'waiting',
			error: null
		};
	}

	try {
		// Decode the base64-encoded file data
		const decodedData = atob(fileParam);
		const fileData = JSON.parse(decodedData);

		// Determine what type of data we're working with
		if (fileType === 'show' && fileData.date) {
			// Single show file - redirect to show detail page
			// Expected format: { date: "1991-03-23", venue: {...}, setlist: [...] }
			redirect(302, `/shows/${fileData.date}`);
		} else if (fileType === 'song' && fileData.slug) {
			// Single song file - redirect to song page
			// Expected format: { slug: "ants-marching", title: "Ants Marching", ... }
			redirect(302, `/songs/${fileData.slug}`);
		} else if (fileType === 'batch' && Array.isArray(fileData)) {
			// Batch file with multiple shows/songs - redirect to shows list
			// Let the user browse and select
			redirect(302, '/shows');
		} else if (fileData.shows && Array.isArray(fileData.shows)) {
			// Concert data with setlists - redirect to first show
			const firstShow = fileData.shows[0];
			if (firstShow.date) {
				redirect(302, `/shows/${firstShow.date}`);
			} else {
				redirect(302, '/shows');
			}
		}

		// Fallback if format not recognized
		return {
			status: 'unsupported_format',
			error: 'File format not recognized',
			fileData
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			status: 'error',
			error: `Failed to process file: ${errorMessage}`
		};
	}
};
