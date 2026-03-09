const EARTH_TEXTURE_PATTERN = /(world\.topo\.|earth-blue-marble\.jpg)/i;

export function unwrapLegacyProxy(rawUrl) {
  try {
    const parsed = new URL(rawUrl, window.location.origin);

    if (parsed.hostname === 'api.codetabs.com') {
      return parsed.searchParams.get('quest') || rawUrl;
    }

    if (parsed.hostname === 'api.allorigins.win') {
      const wrapped = parsed.searchParams.get('url') || rawUrl;

      if (parsed.pathname.startsWith('/get')) {
        return `/api/allorigins-get?url=${encodeURIComponent(wrapped)}`;
      }

      return wrapped;
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function proxifyExternalUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  const normalized = unwrapLegacyProxy(rawUrl);

  if (EARTH_TEXTURE_PATTERN.test(normalized)) {
    return '/earth-blue-marble.jpg';
  }

  try {
    const parsed = new URL(normalized, window.location.origin);

    if (!/^https?:$/.test(parsed.protocol)) {
      return parsed.toString();
    }

    if (parsed.origin === window.location.origin) {
      return parsed.toString();
    }

    return `/api/proxy?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return rawUrl;
  }
}
