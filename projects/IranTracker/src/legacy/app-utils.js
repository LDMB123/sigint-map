import { escapeHtml } from './shared-utils.js';

const STATUS_CLASS_BY_STATE = {
  live: 'status-dot status-dot--live',
  offline: 'status-dot status-dot--offline',
  sim: 'status-dot status-dot--sim',
  error: 'status-dot status-dot--offline',
  connecting: 'status-dot status-dot--sim',
  idle: 'status-dot status-dot--offline',
};

export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 10000, ...init } = options;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchFirstSuccessful(urls, options = {}) {
  const attempts = Array.isArray(urls) ? urls : [urls];
  const {
    parseAs = 'json',
    validate,
    timeoutMs = 10000,
    ...fetchInit
  } = options;
  const errors = [];

  for (const url of attempts) {
    try {
      const response = await fetchWithTimeout(url, { timeoutMs, ...fetchInit });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = parseAs === 'text'
        ? await response.text()
        : parseAs === 'json'
          ? await response.json()
          : response;

      if (typeof validate === 'function' && !validate(data, response, url)) {
        throw new Error(`Validation failed for ${url}`);
      }

      return { data, response, url };
    } catch (error) {
      errors.push({ url, error });
    }
  }

  const finalError = new Error(`All request attempts failed (${attempts.length}).`);
  finalError.attempts = errors;
  throw finalError;
}

export function setStatusDot(element, status = 'offline') {
  if (!element) return;
  element.className = STATUS_CLASS_BY_STATE[status] || STATUS_CLASS_BY_STATE.offline;
}

export function setStatusTag(element, status = 'offline', text = status.toUpperCase()) {
  if (!element) return;
  element.textContent = text;
  element.className = status === 'live' ? 'source-item__tag' : 'source-item__tag source-item__tag--sim';
}

export function setStatusMessage(element, status = 'offline', text = '') {
  if (!element) return;
  element.innerHTML = `<span class="${STATUS_CLASS_BY_STATE[status] || STATUS_CLASS_BY_STATE.offline}"></span> ${escapeHtml(text)}`;
}

export function applySourceStatus({ status = 'offline', dot, tag, panelDot, tagText } = {}) {
  setStatusDot(dot, status);
  setStatusTag(tag, status, tagText || status.toUpperCase());
  setStatusDot(panelDot, status);
}

export function clearTrackedObjects(objects, options = {}) {
  const {
    layer,
    disposeObject,
    pickableObjects = null,
    removeFromPickables = true,
    removeDescendantsFromPickables = false,
  } = options;

  if (!Array.isArray(objects) || objects.length === 0) return;

  for (const object of objects) {
    if (layer && object) {
      layer.remove(object);
    }

    if (typeof disposeObject === 'function') {
      disposeObject(object);
    }

    if (Array.isArray(pickableObjects)) {
      if (removeFromPickables) {
        const index = pickableObjects.indexOf(object);
        if (index !== -1) {
          pickableObjects.splice(index, 1);
        }
      }

      if (removeDescendantsFromPickables && object?.traverse) {
        object.traverse((node) => {
          if (node === object) return;
          const nestedIndex = pickableObjects.indexOf(node);
          if (nestedIndex !== -1) {
            pickableObjects.splice(nestedIndex, 1);
          }
        });
      }
    }
  }

  objects.length = 0;
}

export function isFiniteCoordinatePair(lat, lon) {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [value];
}
