import { NextResponse } from 'next/server';
import { proxyUpstreamResponse } from '../../../src/lib/upstream-route.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiKey() {
  return process.env.OPENRADIATION_API_KEY?.trim() || '';
}

function buildTarget(apiKey) {
  const target = new URL('https://request.openradiation.net/measurements');
  target.searchParams.set('apiKey', apiKey);
  return target;
}

export async function GET(request) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENRADIATION_API_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  return proxyUpstreamResponse(request, buildTarget(apiKey));
}
