const COPY_TEXTAREA_STYLE = 'position:fixed;inset:-9999px;opacity:0;pointer-events:none;';
const DOWNLOAD_REVOKE_DELAY_MS = 1200;
const HTML_SIGNATURE_KEY = Symbol.for('sigint-map:html-signature');

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorageValue(key) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key, value) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeHref(value, fallback = '#') {
  if (!value) return fallback;

  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://example.com';
    const url = new URL(String(value), base);
    return /^https?:$/i.test(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function readStoredJson(key, fallback) {
  const raw = readStorageValue(key);
  if (raw == null || raw === '') return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value) {
  return writeStorageValue(key, JSON.stringify(value));
}

export function readStoredFlag(key, fallback = false) {
  const raw = readStorageValue(key);
  if (raw == null || raw === '') return fallback;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'boolean' ? parsed : Boolean(parsed);
  } catch {
    return fallback;
  }
}

export function writeStoredFlag(key, value) {
  return writeStorageValue(key, value ? '1' : '0');
}

export function readStoredString(key, fallback) {
  const raw = readStorageValue(key);
  return raw == null ? fallback : String(raw);
}

export function writeStoredString(key, value) {
  return writeStorageValue(key, String(value));
}

export function formatAge(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) return '—';
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) return '—';

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return '—';
  }
}

export function formatCoords(lat, lon, options = {}) {
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  const decimals = Number.isFinite(options.decimals) ? options.decimals : 2;
  const spaced = options.spaced === true;
  const degreeJoin = spaced ? '° ' : '°';

  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLon)) return '—';

  return `${Math.abs(safeLat).toFixed(decimals)}${degreeJoin}${safeLat >= 0 ? 'N' : 'S'} · ${Math.abs(safeLon).toFixed(decimals)}${degreeJoin}${safeLon >= 0 ? 'E' : 'W'}`;
}

export function haversineKm(aLat, aLon, bLat, bLon) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function copyText(text) {
  const safeText = String(text ?? '');

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(safeText);
  }

  return new Promise((resolve, reject) => {
    let textarea = null;

    try {
      textarea = document.createElement('textarea');
      textarea.value = safeText;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.cssText = COPY_TEXTAREA_STYLE;
      document.body.appendChild(textarea);
      textarea.select();

      const succeeded = document.execCommand('copy');
      if (!succeeded) {
        throw new Error("document.execCommand('copy') returned false.");
      }

      resolve();
    } catch (error) {
      reject(error);
    } finally {
      textarea?.remove();
    }
  });
}

export function downloadTextFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_REVOKE_DELAY_MS);
}

export function debounce(fn, delay) {
  let timeoutId = null;
  let lastArgs = [];

  const debounced = (...args) => {
    lastArgs = args;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      fn(...lastArgs);
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId === null) return;
    window.clearTimeout(timeoutId);
    timeoutId = null;
  };

  debounced.flush = () => {
    if (timeoutId === null) return;
    window.clearTimeout(timeoutId);
    timeoutId = null;
    fn(...lastArgs);
  };

  return debounced;
}

export function createCleanupBucket(errorPrefix = '[SIGINT-MAP] Cleanup failed:') {
  const cleanupFns = [];

  return {
    push(fn) {
      if (typeof fn === 'function') cleanupFns.push(fn);
    },
    run() {
      while (cleanupFns.length > 0) {
        const fn = cleanupFns.pop();
        try {
          fn();
        } catch (error) {
          console.error(errorPrefix, error);
        }
      }
    },
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getSigintPublicApi() {
  return window.__SIGINT_MAP_PUBLIC__ || {};
}

export function getSigintFusionApi() {
  return window.__SIGINT_MAP_FUSION_CENTER__ || {};
}

export function getSigintSourceHealth() {
  const api = getSigintPublicApi();
  if (typeof api.getSourceHealth === 'function') {
    try {
      return api.getSourceHealth() || {};
    } catch {
      // ignore public API failures
    }
  }

  return window.__SIGINT_MAP_SOURCE_HEALTH__ || {};
}

export function isDebugEnabled() {
  if (typeof window === 'undefined') return false;

  try {
    const search = new URLSearchParams(window.location.search);
    const queryValue = search.get('debug');
    if (queryValue === '1' || queryValue === 'true') return true;
    if (queryValue === '0' || queryValue === 'false') return false;
  } catch {
    // ignore invalid URL state
  }

  return readStoredFlag('sigint-map:debug', false);
}

export function debugLog(...args) {
  if (!isDebugEnabled()) return;
  console.log(...args);
}



export function stableSerialize(value) {
  const seen = new WeakSet();

  try {
    return JSON.stringify(value, (_key, currentValue) => {
      if (!currentValue || typeof currentValue !== 'object') return currentValue;
      if (seen.has(currentValue)) return '[Circular]';
      seen.add(currentValue);
      if (Array.isArray(currentValue)) return currentValue;
      return Object.keys(currentValue).sort().reduce((accumulator, key) => {
        accumulator[key] = currentValue[key];
        return accumulator;
      }, {});
    });
  } catch {
    return String(value ?? '');
  }
}

export function setInnerHtmlIfChanged(element, html, signature = html) {
  if (!element) return false;

  const nextHtml = String(html ?? '');
  const nextSignature = typeof signature === 'string' ? signature : stableSerialize(signature);

  if (element[HTML_SIGNATURE_KEY] === nextSignature && element.innerHTML === nextHtml) {
    return false;
  }

  element[HTML_SIGNATURE_KEY] = nextSignature;
  element.innerHTML = nextHtml;
  return true;
}

export function setTextContentIfChanged(element, value) {
  if (!element) return false;

  const nextValue = String(value ?? '');
  if (element.textContent === nextValue) {
    return false;
  }

  element.textContent = nextValue;
  return true;
}

export function dispatchSigintEvent(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return true;
  } catch {
    return false;
  }
}
