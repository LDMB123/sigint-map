/**
 * Static Pages Sitemap
 * URLs that rarely change: homepage, main navigation pages, info pages
 */

import type { RequestHandler } from '@sveltejs/kit';
import { _generateUrlEntry as generateUrlEntry, _wrapSitemap as wrapSitemap } from '../sitemap.xml/+server';

const BASE_URL = process.env.PUBLIC_SITE_URL || 'https://dmbalmanac.com';
const TODAY = new Date().toISOString().split('T')[0];

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
  { path: '/search', priority: 0.6, changefreq: 'daily' },
  { path: '/faq', priority: 0.5, changefreq: 'monthly' },
  { path: '/about', priority: 0.5, changefreq: 'yearly' },
  { path: '/contact', priority: 0.4, changefreq: 'yearly' },
  { path: '/protocol', priority: 0.3, changefreq: 'yearly' }
];

export const GET: RequestHandler = async () => {
  const urls = STATIC_PAGES.map(page =>
    generateUrlEntry(page.path, TODAY, page.priority, page.changefreq)
  );

  const sitemap = wrapSitemap(urls);

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000' // 1 week + 30 day SWR
    }
  });
};
