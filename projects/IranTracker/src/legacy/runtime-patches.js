import * as THREE from 'three';
import { proxifyExternalUrl } from './url-rewriter.js';

const SOURCE_DEFINITIONS = [
  { key: 'opensky', label: 'OpenSky ADS-B', match: /opensky-network\.org/ },
  { key: 'usgs', label: 'USGS Seismic', match: /earthquake\.usgs\.gov/ },
  { key: 'firms', label: 'NASA FIRMS', match: /\/api\/firms\b|firms\.modaps\.eosdis\.nasa\.gov/ },
  { key: 'gdelt', label: 'GDELT Events', match: /api\.gdeltproject\.org/ },
  { key: 'sigmet', label: 'Aviation SIGMET', match: /aviationweather\.gov\/api\/data\/isigmet/ },
  { key: 'oil', label: 'Oil Price', match: /api\.oilpriceapi\.com/ },
  { key: 'adsb_lol', label: 'ADSB.lol Military', match: /api\.adsb\.lol/ },
  { key: 'weather', label: 'Open-Meteo Wind', match: /api\.open-meteo\.com\/v1\/forecast/ },
  { key: 'marine', label: 'Marine Weather', match: /marine-api\.open-meteo\.com\/v1\/marine|api\.open-meteo\.com\/v1\/marine/ },
  { key: 'safecast', label: 'Safecast Radiation', match: /api\.safecast\.org/ },
  { key: 'openradiation', label: 'OpenRadiation', match: /\/api\/openradiation\b/ },
  { key: 'conflict', label: 'ReliefWeb Conflict', match: /api\.reliefweb\.int/ },
  { key: 'news', label: 'RSS / World News', match: /aljazeera\.com\/xml\/rss|feeds\.bbci\.co\.uk|theguardian\.com\/world\/rss|rss2json/ },
  { key: 'milnews', label: 'Military News', match: /twz\.com\/feed|militarytimes\.com|breakingdefense\.com\/feed/ },
  { key: 'regional_news', label: 'Regional News', match: /iaea\.org\/newscenter\/news|jpost\.com\/rss|israelhayom\.com\/feed|middleeasteye\.net\/rss/ },
];

function ensureSourceHealthStore() {
  if (!window.__SIGINT_MAP_SOURCE_HEALTH__) {
    window.__SIGINT_MAP_SOURCE_HEALTH__ = {};
  }

  return window.__SIGINT_MAP_SOURCE_HEALTH__;
}

function emitSourceHealth(detail) {
  try {
    window.dispatchEvent(new CustomEvent('sigint:source-health', { detail }));
  } catch {
    // no-op
  }
}

function unwrapTelemetryUrl(rawUrl) {
  if (!rawUrl) return '';

  let current = rawUrl;

  for (let depth = 0; depth < 3; depth += 1) {
    let parsed;

    try {
      parsed = new URL(current, window.location.origin);
    } catch {
      break;
    }

    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (pathname === '/api/proxy' || pathname === '/api/allorigins-get') {
      const nested = parsed.searchParams.get('url');
      if (!nested) break;
      current = nested;
      continue;
    }

    if (hostname.includes('api.allorigins.win')) {
      const nested = parsed.searchParams.get('url');
      if (!nested) break;
      current = decodeURIComponent(nested);
      continue;
    }

    if (hostname.includes('api.codetabs.com')) {
      const nested = parsed.searchParams.get('quest');
      if (!nested) break;
      current = decodeURIComponent(nested);
      continue;
    }

    break;
  }

  return current;
}

function classifyTelemetrySource(url) {
  if (!url) return null;
  const normalized = unwrapTelemetryUrl(url).toLowerCase();
  return SOURCE_DEFINITIONS.find((definition) => definition.match.test(normalized)) || null;
}

function updateSourceHealth(definition, url, patch = {}) {
  if (!definition) return null;

  const store = ensureSourceHealthStore();
  const previous = store[definition.key] || {};
  const next = {
    key: definition.key,
    label: definition.label,
    url,
    status: patch.status ?? previous.status ?? 'idle',
    lastFetchedAt: patch.lastFetchedAt ?? previous.lastFetchedAt ?? null,
    latencyMs: patch.latencyMs ?? previous.latencyMs ?? null,
    statusCode: patch.statusCode ?? previous.statusCode ?? null,
    error: patch.error ?? previous.error ?? null,
    pending: Math.max(0, patch.pending ?? previous.pending ?? 0),
    updatedAt: Date.now(),
  };

  store[definition.key] = next;
  emitSourceHealth(next);
  return next;
}

function beginTrackedFetch(definition, url) {
  if (!definition) return null;

  const store = ensureSourceHealthStore();
  const previous = store[definition.key] || {};
  const previousPending = Number(previous.pending) || 0;
  const nextPending = previousPending + 1;
  const nextStatus = previous.lastFetchedAt && previous.status === 'live'
    ? 'live'
    : previousPending > 0
      ? previous.status || 'connecting'
      : 'connecting';

  return updateSourceHealth(definition, url, {
    status: nextStatus,
    error: nextStatus === 'live' ? previous.error ?? null : null,
    pending: nextPending,
  });
}

function finishTrackedFetch(definition, url, patch = {}) {
  if (!definition) return null;

  const store = ensureSourceHealthStore();
  const previous = store[definition.key] || {};
  const nextPending = Math.max(0, (Number(previous.pending) || 0) - 1);

  return updateSourceHealth(definition, url, {
    ...patch,
    pending: nextPending,
  });
}

export function patchFetch() {
  if (window.__SIGINT_MAP_FETCH_PATCHED__) {
    return window.__SIGINT_MAP_FETCH_RESTORE__;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input?.url;

    if (!url) {
      return nativeFetch(input, init);
    }

    const telemetryUrl = unwrapTelemetryUrl(url);
    const sourceDefinition = classifyTelemetrySource(telemetryUrl || url);
    const proxiedUrl = proxifyExternalUrl(url);
    const startedAt = performance.now();

    beginTrackedFetch(sourceDefinition, telemetryUrl || url);

    try {
      const response = input instanceof Request
        ? await nativeFetch(new Request(proxiedUrl, input), init)
        : await nativeFetch(proxiedUrl, init);

      finishTrackedFetch(sourceDefinition, telemetryUrl || url, {
        status: response.ok ? 'live' : 'error',
        lastFetchedAt: Date.now(),
        latencyMs: Math.round(performance.now() - startedAt),
        statusCode: response.status,
        error: response.ok ? null : `HTTP ${response.status}`,
      });

      return response;
    } catch (error) {
      finishTrackedFetch(sourceDefinition, telemetryUrl || url, {
        status: 'error',
        lastFetchedAt: Date.now(),
        latencyMs: Math.round(performance.now() - startedAt),
        statusCode: null,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };

  const restore = () => {
    window.fetch = nativeFetch;
    window.__SIGINT_MAP_FETCH_PATCHED__ = false;
    window.__SIGINT_MAP_FETCH_RESTORE__ = undefined;
  };

  window.__SIGINT_MAP_FETCH_PATCHED__ = true;
  window.__SIGINT_MAP_FETCH_RESTORE__ = restore;

  return restore;
}

export function patchThreeImageLoader() {
  if (window.__SIGINT_MAP_IMAGELOADER_PATCHED__) {
    return window.__SIGINT_MAP_IMAGELOADER_RESTORE__;
  }

  const originalLoad = THREE.ImageLoader.prototype.load;

  THREE.ImageLoader.prototype.load = function patchedImageLoad(url, onLoad, onProgress, onError) {
    return originalLoad.call(this, proxifyExternalUrl(url), onLoad, onProgress, onError);
  };

  const restore = () => {
    THREE.ImageLoader.prototype.load = originalLoad;
    window.__SIGINT_MAP_IMAGELOADER_PATCHED__ = false;
    window.__SIGINT_MAP_IMAGELOADER_RESTORE__ = undefined;
  };

  window.__SIGINT_MAP_IMAGELOADER_PATCHED__ = true;
  window.__SIGINT_MAP_IMAGELOADER_RESTORE__ = restore;

  return restore;
}
