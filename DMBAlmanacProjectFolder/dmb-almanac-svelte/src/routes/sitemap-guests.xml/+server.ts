/**
 * Dynamic Guests Sitemap
 * Lists all guest musician pages
 */

import type { RequestHandler } from '@sveltejs/kit';
import { getGuests } from '$lib/server/data-loader';
import { _generateUrlEntry as generateUrlEntry, _wrapSitemap as wrapSitemap } from '../sitemap.xml/+server';

export const GET: RequestHandler = async () => {
  try {
    const guests = getGuests();

    if (!guests || guests.length === 0) {
      return new Response(wrapSitemap([]), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Generate URL entries for each guest
    const urls = guests.map(guest =>
      generateUrlEntry(
        `/guests/${guest.slug}`,
        undefined,
        0.6, // Guests are medium priority
        'monthly' // Guest info changes occasionally
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
    console.error('[Sitemap] Guests sitemap generation failed:', error);

    return new Response(wrapSitemap([]), {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
