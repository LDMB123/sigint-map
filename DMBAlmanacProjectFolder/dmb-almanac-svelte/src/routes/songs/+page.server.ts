/**
 * Songs Page Server Load Function
 *
 * Provides SSR data for the songs catalog page:
 * - All songs (sorted by sortTitle)
 * - Song statistics (total, originals, covers)
 *
 * This pre-renders the complete song list for immediate display,
 * eliminating client-side IndexedDB loading delay.
 */

import type { PageServerLoad } from './$types';
import { getSongs, getSongStats } from '$lib/server/data-loader';

export const load = (async ({ setHeaders }) => {
  // Set cache headers - songs data changes infrequently
  // Cache for 10 minutes, stale-while-revalidate for 1 hour
  setHeaders({
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600'
  });

  // Load all songs sorted by sortTitle for alphabetical display
  const songs = getSongs();
  const sortedSongs = [...songs].sort((a, b) => {
    const aSort = a.sortTitle || a.title;
    const bSort = b.sortTitle || b.title;
    return aSort.localeCompare(bSort);
  });

  // Get song statistics
  const songStats = getSongStats();

  return {
    songs: sortedSongs,
    songStats
  };
}) satisfies PageServerLoad;
