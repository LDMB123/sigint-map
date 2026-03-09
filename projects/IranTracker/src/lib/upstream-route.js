import { NextResponse } from 'next/server';
import {
  buildUpstreamErrorPayload,
  buildUpstreamResponse,
  fetchUpstream,
  parseTargetUrl,
} from './upstream-proxy.js';

export function proxyErrorResponse(error) {
  const failure = buildUpstreamErrorPayload(error);
  return NextResponse.json(failure.body, { status: failure.status });
}

export async function proxyUpstreamResponse(request, target, options = {}) {
  try {
    const upstream = await fetchUpstream(request, target);
    return await buildUpstreamResponse(upstream, target, options);
  } catch (error) {
    return proxyErrorResponse(error);
  }
}

export function createUrlProxyHandler(options = {}) {
  return async function GET(request) {
    const rawUrl = request.nextUrl.searchParams.get('url');
    const { error, status, target } = parseTargetUrl(rawUrl);

    if (error) {
      return NextResponse.json({ error }, { status });
    }

    return proxyUpstreamResponse(request, target, options);
  };
}
