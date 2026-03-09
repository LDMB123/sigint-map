import { NextResponse } from 'next/server';
import { proxyUpstreamResponse } from '../../../src/lib/upstream-route.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiKey() {
  return process.env.FIRMS_API_KEY?.trim() || '';
}

function buildTarget(apiKey) {
  return new URL(
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(apiKey)}/MODIS_NRT/30,12,65,42/2`,
  );
}

export async function GET(request) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'FIRMS_API_KEY is not configured on the server.' },
      { status: 503 },
    );
  }

  return proxyUpstreamResponse(request, buildTarget(apiKey));
}
