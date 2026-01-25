/**
 * Dynamic Venues Sitemap
 * Lists all venue pages
 */

import type { RequestHandler } from '@sveltejs/kit';
import { getVenues } from '$lib/server/data-loader';
import { _generateUrlEntry as generateUrlEntry, _wrapSitemap as wrapSitemap } from '../sitemap.xml/+server';

export const GET: RequestHandler = async () => {
  try {
    const venues = getVenues();

    if (!venues || venues.length === 0) {
      return new Response(wrapSitemap([]), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Generate URL entries for each venue
    const urls = venues.map(venue =>
      generateUrlEntry(
        `/venues/${venue.id}`,
        undefined,
        0.7, // Venues are medium-high priority
        'monthly' // Venue info changes occasionally
      )
    );

    const sitemap = wrapSitemap(urls);

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000' // 1 week + 30 day SWR
      }
    });
  } catch (error) {
    console.error('[Sitemap] Venues sitemap generation failed:', error);

    return new Response(wrapSitemap([]), {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
