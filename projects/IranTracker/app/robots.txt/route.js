import { SITE_URL } from '../../src/lib/site-config.js';

const ROBOTS_BODY = `User-agent: *\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml`;

export function GET() {
  return new Response(ROBOTS_BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
