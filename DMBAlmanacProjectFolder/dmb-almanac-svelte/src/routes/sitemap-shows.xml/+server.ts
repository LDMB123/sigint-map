/**
 * Dynamic Shows Sitemap
 * Lists all concert pages with their dates for freshness signals
 *
 * Performance note: If you exceed 50,000 URLs, split this into:
 * - sitemap-shows-2024.xml
 * - sitemap-shows-2023.xml
 * - sitemap-shows-2022.xml, etc.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { getShows } from '$lib/server/data-loader';
import { _generateUrlEntry as generateUrlEntry, _wrapSitemap as wrapSitemap } from '../sitemap.xml/+server';

export const GET: RequestHandler = async () => {
  try {
    const shows = getShows();

    if (!shows || shows.length === 0) {
      // Return empty sitemap if no shows found
      return new Response(wrapSitemap([]), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Generate URL entries for each show
    // Use show date as lastmod for freshness signal
    const urls = shows.map(show =>
      generateUrlEntry(
        `/shows/${show.id}`,
        show.date || undefined,
        0.8, // Shows are high priority
        'yearly' // Concert dates don't change
      )
    );

    const sitemap = wrapSitemap(urls);

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' // 24 hours + 7 day SWR
      }
    });
  } catch (error) {
    console.error('[Sitemap] Shows sitemap generation failed:', error);

    return new Response(wrapSitemap([]), {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
