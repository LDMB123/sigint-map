const RAW_ALLOWED_UPSTREAM_HOSTS = [
  'api.adsb.lol',
  'api.gdeltproject.org',
  'api.oilpriceapi.com',
  'api.open-meteo.com',
  'api.reliefweb.int',
  'api.rss2json.com',
  'api.safecast.org',
  'aviationweather.gov',
  'breakingdefense.com',
  'earthquake.usgs.gov',
  'en.wikipedia.org',
  'eoimages.gsfc.nasa.gov',
  'feeds.bbci.co.uk',
  'firms.modaps.eosdis.nasa.gov',
  'marine-api.open-meteo.com',
  'opensky-network.org',
  'request.openradiation.net',
  'twz.com',
  'www.aljazeera.com',
  'www.cbsnews.com',
  'www.centcom.mil',
  'www.cnbc.com',
  'www.defense.gov',
  'www.iaea.org',
  'www.israelhayom.com',
  'www.jpost.com',
  'www.middleeasteye.net',
  'www.militarytimes.com',
  'www.theguardian.com',
];

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export const ALLOWED_UPSTREAM_HOSTS = new Set(RAW_ALLOWED_UPSTREAM_HOSTS);
export const ALLOWED_UPSTREAM_PORTS = new Set(['', '80', '443']);
export const UPSTREAM_TIMEOUT_MS = 15000;
export const MAX_UPSTREAM_REDIRECTS = 3;
export const UPSTREAM_USER_AGENT = 'Mozilla/5.0 (compatible; SIGINT-MAP-Next/1.4)';

export class UpstreamProxyError extends Error {
  constructor(message, status = 502, cause = undefined) {
    super(message, cause ? { cause } : undefined);
    this.name = 'UpstreamProxyError';
    this.status = status;
    this.detail = cause instanceof Error ? cause.message : undefined;
  }
}

export function parseTargetUrl(rawUrl) {
  if (!rawUrl) {
    return { error: 'Missing url parameter.', status: 400 };
  }

  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return { error: 'Invalid url parameter.', status: 400 };
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return { error: 'Unsupported protocol.', status: 400 };
  }

  if (target.username || target.password) {
    return { error: 'Credentials in url are not allowed.', status: 400 };
  }

  if (!ALLOWED_UPSTREAM_HOSTS.has(target.hostname)) {
    return { error: `Host not allowed: ${target.hostname}`, status: 403 };
  }

  if (!ALLOWED_UPSTREAM_PORTS.has(target.port)) {
    return { error: `Port not allowed: ${target.port || '(default)'}`, status: 400 };
  }

  return { target };
}

function isRedirectStatus(status) {
  return REDIRECT_STATUSES.has(status);
}

export function buildUpstreamHeaders(request, target) {
  const accept = request.headers.get('accept') || '*/*';
  const headers = new Headers({
    Accept: accept,
    'User-Agent': UPSTREAM_USER_AGENT,
  });

  if (target.hostname === 'aviationweather.gov') {
    headers.set('Accept', 'application/geo+json, application/json, */*');
  }

  return headers;
}

export function getProxyResponseHeaders(upstream, target, options = {}) {
  const { includeContentLength = true } = options;
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  const contentLength = upstream.headers.get('content-length');

  if (contentType) headers.set('content-type', contentType);
  if (includeContentLength && contentLength) headers.set('content-length', contentLength);
  headers.set('cache-control', 'public, max-age=30, stale-while-revalidate=120');
  headers.set('cross-origin-resource-policy', 'same-origin');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-proxied-host', target.hostname);

  return headers;
}

export function buildUpstreamErrorPayload(error, fallbackMessage = 'Upstream fetch failed.') {
  const status = error instanceof UpstreamProxyError ? error.status : 502;
  const message = error instanceof UpstreamProxyError ? error.message : fallbackMessage;
  const detail = error instanceof UpstreamProxyError
    ? error.detail || error.message
    : 'Internal proxy error';

  return {
    status,
    body: {
      error: message,
      detail,
    },
  };
}

export async function buildUpstreamResponse(upstream, target, options = {}) {
  const { wrapTextAsJsonKey = '' } = options;

  if (wrapTextAsJsonKey) {
    const text = await upstream.text();
    const headers = getProxyResponseHeaders(upstream, target, { includeContentLength: false });
    headers.set('content-type', 'application/json; charset=utf-8');

    return Response.json(
      { [wrapTextAsJsonKey]: text },
      {
        status: upstream.status,
        headers,
      },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: getProxyResponseHeaders(upstream, target),
  });
}

function resolveRedirectTarget(currentTarget, locationHeader) {
  if (!locationHeader) {
    throw new UpstreamProxyError('Upstream redirect missing Location header.', 502);
  }

  let redirectUrl;
  try {
    redirectUrl = new URL(locationHeader, currentTarget.toString());
  } catch {
    throw new UpstreamProxyError('Upstream redirect location was invalid.', 502);
  }

  const { error, status, target } = parseTargetUrl(redirectUrl.toString());
  if (error) {
    throw new UpstreamProxyError(`Unsafe upstream redirect blocked: ${error}`, status);
  }

  return target;
}

async function fetchSingleUpstream(request, target) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    return await fetch(target.toString(), {
      headers: buildUpstreamHeaders(request, target),
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new UpstreamProxyError(
        `Upstream request timed out after ${UPSTREAM_TIMEOUT_MS}ms.`,
        504,
        error,
      );
    }

    throw new UpstreamProxyError('Upstream fetch failed.', 502, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchUpstream(request, target) {
  let currentTarget = target;

  for (let redirectCount = 0; redirectCount <= MAX_UPSTREAM_REDIRECTS; redirectCount += 1) {
    const response = await fetchSingleUpstream(request, currentTarget);

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    if (redirectCount >= MAX_UPSTREAM_REDIRECTS) {
      throw new UpstreamProxyError(
        `Upstream redirected too many times (max ${MAX_UPSTREAM_REDIRECTS}).`,
        502,
      );
    }

    currentTarget = resolveRedirectTarget(currentTarget, response.headers.get('location'));
  }

  throw new UpstreamProxyError('Upstream redirect resolution failed.', 502);
}
