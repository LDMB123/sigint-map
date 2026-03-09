import { createUrlProxyHandler } from '../../../src/lib/upstream-route.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createUrlProxyHandler({ wrapTextAsJsonKey: 'contents' });
