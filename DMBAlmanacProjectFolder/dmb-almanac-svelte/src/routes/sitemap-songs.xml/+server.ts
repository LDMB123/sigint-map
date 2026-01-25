/**
 * Dynamic Songs Sitemap
 * Lists all song pages
 */

import type { RequestHandler } from '@sveltejs/kit';
import { getSongs } from '$lib/server/data-loader';
import { _generateUrlEntry as generateUrlEntry, _wrapSitemap as wrapSitemap } from '../sitemap.xml/+server';

export const GET: RequestHandler = async () => {
  try {
    const songs = getSongs();

    if (!songs || songs.length === 0) {
      return new Response(wrapSitemap([]), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // Generate URL entries for each song
    const urls = songs.map(song =>
      generateUrlEntry(
        `/songs/${song.slug}`,
        undefined,
        0.7, // Songs are medium-high priority
        'monthly' // Song info changes occasionally
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
    console.error('[Sitemap] Songs sitemap generation failed:', error);

    return new Response(wrapSitemap([]), {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};
