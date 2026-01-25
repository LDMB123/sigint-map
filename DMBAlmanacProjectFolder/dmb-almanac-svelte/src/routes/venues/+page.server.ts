/**
 * Venues Page Server Load Function
 *
 * Provides SSR data for the venues page:
 * - All venues (sorted by name)
 * - Venue statistics (total venues, total shows, states)
 * - Top 5 venues by show count
 *
 * This pre-renders venue listings for immediate display,
 * eliminating client-side IndexedDB loading delay.
 */

import type { PageServerLoad } from './$types';
import { getVenues, getVenueStats, getTopVenues } from '$lib/server/data-loader';

export const load = (async ({ setHeaders }) => {
  // Set cache headers - venue data changes infrequently
  // Cache for 10 minutes, stale-while-revalidate for 1 hour
  setHeaders({
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600'
  });

  // Load all venues sorted by name
  const venues = getVenues();
  const sortedVenues = [...venues].sort((a, b) => a.name.localeCompare(b.name));

  // Get venue statistics
  const venueStats = getVenueStats();

  // Get top venues by show count
  const topVenues = getTopVenues(5);

  return {
    venues: sortedVenues,
    venueStats,
    topVenues
  };
}) satisfies PageServerLoad;
