/**
 * Tours Page Server Load Function
 *
 * Provides SSR data for the tours overview page:
 * - Tours grouped by decade
 * - Global statistics (years active, total shows, etc.)
 *
 * This pre-renders tour navigation for immediate display,
 * eliminating client-side IndexedDB loading delay.
 */

import type { PageServerLoad } from './$types';
import { getToursGroupedByDecade, getGlobalStats } from '$lib/server/data-loader';

export const load = (async ({ setHeaders }) => {
  // Set cache headers - tour data changes infrequently
  // Cache for 10 minutes, stale-while-revalidate for 1 hour
  setHeaders({
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600'
  });

  // Load tours grouped by decade
  const toursGroupedByDecade = getToursGroupedByDecade();

  // Get global statistics for the header
  const globalStats = getGlobalStats();

  return {
    toursGroupedByDecade,
    globalStats
  };
}) satisfies PageServerLoad;
