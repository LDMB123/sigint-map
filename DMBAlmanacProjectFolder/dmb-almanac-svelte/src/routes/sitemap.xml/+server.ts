/**
 * Dynamic Sitemap Generation
 * Generates a sitemap.xml index that lists all available sitemaps
 *
 * For larger deployments, split into:
 * - sitemap-shows.xml (dynamic shows)
 * - sitemap-songs.xml (dynamic songs)
 * - sitemap-venues.xml (dynamic venues)
 * - sitemap-guests.xml (dynamic guests)
 */

import type { RequestHandler } from '@sveltejs/kit';

// Define your domain (update for your environment)
const BASE_URL = process.env.PUBLIC_SITE_URL || 'https://dmbalmanac.com';

// Static pages with their priority and change frequency
const STATIC_PAGES = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/shows', priority: 0.9, changefreq: 'daily' },
  { path: '/songs', priority: 0.9, changefreq: 'weekly' },
  { path: '/venues', priority: 0.9, changefreq: 'weekly' },
  { path: '/guests', priority: 0.8, changefreq: 'weekly' },
  { path: '/stats', priority: 0.7, changefreq: 'daily' },
  { path: '/visualizations', priority: 0.7, changefreq: 'weekly' },
  { path: '/liberation', priority: 0.7, changefreq: 'daily' },
  { path: '/tours', priority: 0.6, changefreq: 'monthly' },
  { path: '/discography', priority: 0.6, changefreq: 'monthly' },
  { path: '/faq', priority: 0.5, changefreq: 'monthly' },
  { path: '/about', priority: 0.5, changefreq: 'yearly' },
  { path: '/contact', priority: 0.4, changefreq: 'yearly' },
  { path: '/protocol', priority: 0.3, changefreq: 'yearly' }
];

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Return sitemap index that references other sitemaps
    // This is the main sitemap.xml that search engines crawl first
    const sitemapIndex = generateSitemapIndex();

    return new Response(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', // 24 hours + 7 day SWR
        'Content-Length': Buffer.byteLength(sitemapIndex).toString()
      }
    });
  } catch (error) {
    console.error('[Sitemap] Generation failed:', error);

    // Return a minimal sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};

/**
 * Generate sitemap index referencing all subsitemaps
 * This allows for better organization and faster Google crawl
 */
function generateSitemapIndex(): string {
  const today = new Date().toISOString().split('T')[0];

  const sitemaps = [
    { url: '/sitemap-static.xml', lastmod: today },
    { url: '/sitemap-shows.xml', lastmod: today },
    { url: '/sitemap-songs.xml', lastmod: today },
    { url: '/sitemap-venues.xml', lastmod: today },
    { url: '/sitemap-guests.xml', lastmod: today }
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${BASE_URL}${sitemap.url}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

/**
 * Utility functions for subsitemaps
 * These will be used in separate +server.ts files for each resource type
 * Prefixed with underscore to be valid exports in SvelteKit endpoint files
 */

export function _generateUrlEntry(
  path: string,
  lastmod?: string,
  priority: number = 0.7,
  changefreq: string = 'weekly'
): string {
  const priorityStr = priority.toFixed(1);
  const baseUrl = BASE_URL;

  return `  <url>
    <loc>${baseUrl}${path}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priorityStr}</priority>
  </url>`;
}

export function _wrapSitemap(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
