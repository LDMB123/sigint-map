/**
 * Liberation List Page Server Load Function
 *
 * Provides SSR data for the liberation list page:
 * - Full liberation list (sorted by days since last played)
 * - Liberation statistics (count, longest wait, most shows missed)
 *
 * This pre-renders the liberation list for immediate display,
 * eliminating client-side IndexedDB loading delay.
 */

import type { PageServerLoad } from './$types';
import { getLiberationList, getLiberationStats } from '$lib/server/data-loader';

export const load = (async ({ setHeaders }) => {
  // Set cache headers - liberation data can change after each show
  // Cache for 5 minutes, stale-while-revalidate for 30 minutes
  setHeaders({
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800'
  });

  // Load full liberation list, filtered to non-liberated songs
  const allEntries = getLiberationList();
  const liberationList = allEntries
    .filter((e) => !e.isLiberated)
    .sort((a, b) => b.daysSince - a.daysSince);

  // Get liberation statistics
  const liberationStats = getLiberationStats();

  return {
    liberationList,
    liberationStats
  };
}) satisfies PageServerLoad;
