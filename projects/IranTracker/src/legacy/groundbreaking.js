import { createFusionCenter } from './fusion-center.js';
import { createOpsWorkbench } from './ops-workbench.js';
import { createWatchCenter } from './watch-center.js';
import { createExecutiveDeck } from './executive-deck.js';
import { createShowcaseSuite } from './showcase-suite.js';
import { requestGlassPrompt } from './glass-prompt.js';
import {
  copyText,
  createCleanupBucket,
  debounce,
  escapeHtml,
  formatAge,
  getSigintPublicApi as getPublicApi,
  getSigintSourceHealth,
  readStoredJson,
  readStoredString,
  setInnerHtmlIfChanged,
  stableSerialize,
  writeStoredJson,
  writeStoredString,
} from './shared-utils.js';
const MODE_STORAGE_KEY = 'sigint-map:op-mode:v1';
const SAVED_VIEWS_KEY = 'sigint-map:saved-views:v1';
const DEFAULT_MODE = 'analyst';
const DEFAULT_STATE = {
  filter: 'all',
  theme: 'dark',
  sidebarCollapsed: false,
  sat: false,
  search: '',
  time: 167,
  playing: false,
  speed: 1,
  mode: DEFAULT_MODE,
  deck: false,
  tour: false,
  founder: false,
};
const HEALTH_PRIORITY = [
  'opensky',
  'adsb_lol',
  'usgs',
  'firms',
  'gdelt',
  'sigmet',
  'weather',
  'marine',
  'safecast',
  'openradiation',
  'conflict',
  'oil',
  'news',
  'milnews',
  'regional_news',
  'maritime',
];

function formatLatency(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)} ms`;
}

function normalizeCount(raw) {
  if (raw == null) return '—';
  const text = String(raw).trim();
  return text || '—';
}

function parseBooleanParam(value, fallback) {
  if (value == null) return fallback;
  return value === '1' || value === 'true';
}

function injectStyles(bucket) {
  if (document.getElementById('sigint-pro-styles')) return;

  const style = document.createElement('style');
  style.id = 'sigint-pro-styles';
  style.textContent = `
    .sigint-pro-toolbar {
      display:flex;
      align-items:center;
      gap:6px;
      padding:4px 6px;
      border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;
      background:rgba(7, 11, 18, 0.76);
      backdrop-filter:blur(10px);
      box-shadow:0 10px 28px rgba(0,0,0,0.28);
    }
    [data-theme="light"] .sigint-pro-toolbar {
      background:rgba(240,243,248,0.84);
      border-color:rgba(0,0,0,0.08);
    }
    .sigint-pro-mode-group {
      display:flex;
      align-items:center;
      gap:2px;
      padding:2px;
      border-radius:999px;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.06);
    }
    .sigint-pro-mode-btn,
    .sigint-pro-action-btn,
    .sigint-pro-palette-item,
    .sigint-pro-saved-remove {
      border:none;
      outline:none;
      cursor:pointer;
      font:inherit;
    }
    .sigint-pro-mode-btn,
    .sigint-pro-action-btn {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:4px;
      min-height:28px;
      padding:0 10px;
      border-radius:999px;
      background:transparent;
      color:var(--color-text-muted);
      font-family:var(--font-mono);
      font-size:10px;
      letter-spacing:0.08em;
      text-transform:uppercase;
      transition:transform 120ms ease, color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .sigint-pro-mode-btn:hover,
    .sigint-pro-action-btn:hover,
    .sigint-pro-mode-btn:focus-visible,
    .sigint-pro-action-btn:focus-visible {
      color:var(--color-text);
      background:rgba(0,212,255,0.12);
      box-shadow:0 0 0 1px rgba(0,212,255,0.18);
      transform:translateY(-1px);
    }
    .sigint-pro-mode-btn[data-active="true"] {
      color:var(--color-text);
      background:rgba(0,212,255,0.16);
      box-shadow:0 0 0 1px rgba(0,212,255,0.22), 0 0 18px rgba(0,212,255,0.12);
    }
    .sigint-pro-action-btn[data-active="true"] {
      color:#22c55e;
      background:rgba(34,197,94,0.12);
      box-shadow:0 0 0 1px rgba(34,197,94,0.2);
    }
    .sigint-pro-action-btn__hint {
      opacity:0.65;
      font-size:9px;
    }
    .sigint-pro-toast-host {
      position:fixed;
      right:16px;
      bottom:16px;
      z-index:10010;
      display:flex;
      flex-direction:column;
      gap:8px;
      pointer-events:none;
    }
    .sigint-pro-toast {
      min-width:240px;
      max-width:min(360px, 80vw);
      padding:10px 12px;
      border-radius:10px;
      background:rgba(7,11,18,0.9);
      border:1px solid rgba(0,212,255,0.16);
      box-shadow:0 20px 40px rgba(0,0,0,0.35);
      color:var(--color-text);
      font-family:var(--font-mono);
      font-size:11px;
      line-height:1.4;
      opacity:0;
      transform:translateY(8px);
      animation:sigint-pro-toast-in 180ms ease forwards;
    }
    .sigint-pro-toast[data-tone="success"] {
      border-color:rgba(34,197,94,0.24);
      box-shadow:0 20px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(34,197,94,0.08);
    }
    .sigint-pro-toast[data-tone="warning"] {
      border-color:rgba(245,158,11,0.28);
    }
    .sigint-pro-toast[data-tone="danger"] {
      border-color:rgba(239,68,68,0.28);
    }
    @keyframes sigint-pro-toast-in {
      to {
        opacity:1;
        transform:translateY(0);
      }
    }
    .sigint-pro-health-panel,
    .sigint-pro-palette {
      position:fixed;
      z-index:10005;
      background:rgba(7,11,18,0.9);
      border:1px solid rgba(255,255,255,0.08);
      box-shadow:0 24px 80px rgba(0,0,0,0.48);
      backdrop-filter:blur(14px);
      color:var(--color-text);
    }
    [data-theme="light"] .sigint-pro-health-panel,
    [data-theme="light"] .sigint-pro-palette {
      background:rgba(240,243,248,0.94);
      border-color:rgba(0,0,0,0.08);
      box-shadow:0 24px 80px rgba(15,23,42,0.14);
    }
    .sigint-pro-health-panel {
      top:52px;
      right:12px;
      width:min(420px, calc(100vw - 24px));
      border-radius:14px;
      padding:12px;
      display:none;
    }
    .sigint-pro-health-panel[data-open="true"] {
      display:block;
    }
    .sigint-pro-health-header,
    .sigint-pro-palette-header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:10px;
    }
    .sigint-pro-health-title,
    .sigint-pro-palette-title {
      font-family:var(--font-mono);
      font-size:11px;
      letter-spacing:0.14em;
      text-transform:uppercase;
      color:var(--color-air);
    }
    .sigint-pro-health-meta {
      font-family:var(--font-mono);
      font-size:10px;
      color:var(--color-text-faint);
    }
    .sigint-pro-health-table {
      width:100%;
      border-collapse:collapse;
      font-family:var(--font-mono);
      font-size:11px;
    }
    .sigint-pro-health-table th,
    .sigint-pro-health-table td {
      padding:7px 6px;
      border-bottom:1px solid rgba(255,255,255,0.06);
      text-align:left;
      vertical-align:middle;
    }
    .sigint-pro-health-table th {
      color:var(--color-text-faint);
      font-weight:600;
      text-transform:uppercase;
      letter-spacing:0.08em;
      font-size:9px;
    }
    .sigint-pro-health-pill {
      display:inline-flex;
      align-items:center;
      gap:6px;
      padding:2px 8px;
      border-radius:999px;
      font-size:10px;
      text-transform:uppercase;
      letter-spacing:0.08em;
      background:rgba(255,255,255,0.06);
      color:var(--color-text-muted);
      border:1px solid rgba(255,255,255,0.08);
    }
    .sigint-pro-health-pill[data-status="live"] {
      color:#22c55e;
      background:rgba(34,197,94,0.12);
      border-color:rgba(34,197,94,0.18);
    }
    .sigint-pro-health-pill[data-status="connecting"] {
      color:#00d4ff;
      background:rgba(0,212,255,0.12);
      border-color:rgba(0,212,255,0.18);
    }
    .sigint-pro-health-pill[data-status="error"] {
      color:#ef4444;
      background:rgba(239,68,68,0.12);
      border-color:rgba(239,68,68,0.18);
    }
    .sigint-pro-health-pill[data-status="sim"] {
      color:#f59e0b;
      background:rgba(245,158,11,0.14);
      border-color:rgba(245,158,11,0.2);
    }
    .sigint-pro-palette-backdrop {
      position:fixed;
      inset:0;
      z-index:10003;
      display:none;
      background:rgba(2,6,12,0.52);
      backdrop-filter:blur(4px);
    }
    .sigint-pro-palette-backdrop[data-open="true"] {
      display:block;
    }
    .sigint-pro-palette {
      top:10vh;
      left:50%;
      transform:translateX(-50%);
      width:min(720px, calc(100vw - 24px));
      border-radius:16px;
      padding:14px;
      display:none;
    }
    .sigint-pro-palette[data-open="true"] {
      display:block;
    }
    .sigint-pro-palette-input {
      width:100%;
      box-sizing:border-box;
      border:none;
      outline:none;
      border-radius:12px;
      background:rgba(255,255,255,0.05);
      color:var(--color-text);
      padding:14px 16px;
      font-family:var(--font-mono);
      font-size:13px;
      border:1px solid rgba(255,255,255,0.08);
      margin-bottom:12px;
    }
    .sigint-pro-palette-input::placeholder {
      color:var(--color-text-faint);
    }
    .sigint-pro-palette-list {
      display:flex;
      flex-direction:column;
      gap:6px;
      max-height:min(62vh, 560px);
      overflow:auto;
      padding-right:4px;
    }
    .sigint-pro-palette-item {
      width:100%;
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:10px;
      padding:11px 12px;
      border-radius:12px;
      background:transparent;
      border:1px solid rgba(255,255,255,0.06);
      color:var(--color-text);
      text-align:left;
      transition:transform 120ms ease, border-color 120ms ease, background 120ms ease;
    }
    .sigint-pro-palette-item:hover,
    .sigint-pro-palette-item[data-active="true"] {
      background:rgba(0,212,255,0.08);
      border-color:rgba(0,212,255,0.18);
      transform:translateY(-1px);
    }
    .sigint-pro-palette-item__label {
      display:block;
      font-family:var(--font-mono);
      font-size:12px;
      letter-spacing:0.04em;
      color:var(--color-text);
    }
    .sigint-pro-palette-item__meta {
      display:block;
      margin-top:4px;
      font-size:11px;
      color:var(--color-text-muted);
      line-height:1.35;
    }
    .sigint-pro-palette-item__badge {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:24px;
      height:24px;
      padding:0 8px;
      border-radius:999px;
      background:rgba(255,255,255,0.06);
      color:var(--color-text-muted);
      font-family:var(--font-mono);
      font-size:10px;
      letter-spacing:0.08em;
      text-transform:uppercase;
      white-space:nowrap;
    }
    .sigint-pro-palette-empty {
      padding:16px;
      border-radius:12px;
      text-align:center;
      color:var(--color-text-muted);
      border:1px dashed rgba(255,255,255,0.12);
      font-family:var(--font-mono);
      font-size:11px;
    }
    .sigint-pro-saved-remove {
      margin-left:8px;
      padding:0;
      background:none;
      color:var(--color-text-faint);
      font-size:12px;
    }
    .sigint-pro-saved-remove:hover,
    .sigint-pro-saved-remove:focus-visible {
      color:#ef4444;
    }
    body[data-op-mode="briefing"] {
      --sidebar-width:360px;
    }
    body[data-op-mode="briefing"] .keyboard-hints,
    body[data-op-mode="briefing"] .minimap,
    body[data-op-mode="briefing"] .intensity-indicator,
    body[data-op-mode="briefing"] .bottom-bar,
    body[data-op-mode="briefing"] .disclaimer {
      display:none;
    }
    body[data-op-mode="kiosk"] {
      --sidebar-width:0px;
    }
    body[data-op-mode="kiosk"] .sidebar,
    body[data-op-mode="kiosk"] .keyboard-hints,
    body[data-op-mode="kiosk"] .minimap,
    body[data-op-mode="kiosk"] .intensity-indicator,
    body[data-op-mode="kiosk"] .bottom-bar,
    body[data-op-mode="kiosk"] .disclaimer,
    body[data-op-mode="kiosk"] .search-box,
    body[data-op-mode="kiosk"] .filter-bar {
      display:none !important;
    }
    body[data-op-mode="kiosk"] .controls-bar {
      background:linear-gradient(180deg, rgba(6,10,16,0.92) 0%, rgba(6,10,16,0.18) 70%, transparent 100%);
    }
    body[data-op-mode="kiosk"] .time-scrubber {
      left:50%;
      transform:translateX(-50%);
      max-width:min(920px, calc(100vw - 20px));
    }
    @media (max-width: 1120px) {
      .sigint-pro-mode-group {
        display:none;
      }
    }
    @media (max-width: 860px) {
      .sigint-pro-toolbar {
        max-width:calc(100vw - 120px);
        overflow:auto;
      }
      .sigint-pro-action-btn__hint {
        display:none;
      }
      .sigint-pro-health-panel {
        left:12px;
        right:12px;
        width:auto;
      }
      .sigint-pro-health-table {
        font-size:10px;
      }
    }
  `;

  document.head.appendChild(style);
  bucket.push(() => style.remove());
}

function createToastHost(bucket) {
  const host = document.createElement('div');
  host.className = 'sigint-pro-toast-host';
  document.body.appendChild(host);
  bucket.push(() => host.remove());

  return function showToast(message, tone = 'info') {
    const toast = document.createElement('div');
    toast.className = 'sigint-pro-toast';
    toast.dataset.tone = tone;
    toast.textContent = message;
    host.appendChild(toast);

    const timeoutId = window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      window.setTimeout(() => toast.remove(), 180);
    }, 2600);

    bucket.push(() => window.clearTimeout(timeoutId));
  };
}

function captureState() {
  const api = getPublicApi();
  if (typeof api.getState === 'function') {
    return {
      ...DEFAULT_STATE,
      ...api.getState(),
      mode: document.body.dataset.opMode || DEFAULT_MODE,
    };
  }

  const activeFilter = document.querySelector('.filter-btn.filter-btn--active')?.dataset.filter || 'all';
  return {
    ...DEFAULT_STATE,
    filter: activeFilter,
    theme: document.documentElement.getAttribute('data-theme') || 'dark',
    sidebarCollapsed: document.getElementById('sidebar')?.classList.contains('collapsed') || false,
    sat: document.getElementById('sat-toggle')?.classList.contains('sat-toggle--active') || false,
    search: document.getElementById('search-input')?.value || '',
    time: Number(document.getElementById('time-slider')?.value || 0),
    playing: false,
    speed: Number(document.querySelector('.speed-btn.speed-btn--active')?.dataset.speed || 1),
    mode: document.body.dataset.opMode || DEFAULT_MODE,
  };
}

function applyState(nextState) {
  const api = getPublicApi();
  if (typeof api.applyState === 'function') {
    api.applyState(nextState);
    return;
  }

  const targetFilter = nextState.filter;
  if (targetFilter) {
    window.setCurrentFilter?.(targetFilter);
  }

  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (themeToggle && nextState.theme && nextState.theme !== currentTheme) {
    themeToggle.click();
  }

  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarCollapsed = sidebar?.classList.contains('collapsed') || false;
  if (sidebarToggle && typeof nextState.sidebarCollapsed === 'boolean' && nextState.sidebarCollapsed !== sidebarCollapsed) {
    sidebarToggle.click();
  }

  const satToggle = document.getElementById('sat-toggle');
  const satActive = satToggle?.classList.contains('sat-toggle--active') || false;
  if (satToggle && typeof nextState.sat === 'boolean' && nextState.sat !== satActive) {
    satToggle.click();
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput && typeof nextState.search === 'string') {
    searchInput.value = nextState.search;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const timeSlider = document.getElementById('time-slider');
  if (timeSlider && nextState.time != null) {
    timeSlider.value = String(nextState.time);
    timeSlider.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function serializeStateToUrl(state) {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  const stateWithMode = {
    ...DEFAULT_STATE,
    ...state,
  };

  const entries = [
    ['mode', stateWithMode.mode, DEFAULT_STATE.mode],
    ['deck', stateWithMode.deck ? '1' : '0', DEFAULT_STATE.deck ? '1' : '0'],
    ['tour', stateWithMode.tour ? '1' : '0', DEFAULT_STATE.tour ? '1' : '0'],
    ['founder', stateWithMode.founder ? '1' : '0', DEFAULT_STATE.founder ? '1' : '0'],
    ['filter', stateWithMode.filter, DEFAULT_STATE.filter],
    ['theme', stateWithMode.theme, DEFAULT_STATE.theme],
    ['sidebar', stateWithMode.sidebarCollapsed ? '1' : '0', DEFAULT_STATE.sidebarCollapsed ? '1' : '0'],
    ['sat', stateWithMode.sat ? '1' : '0', DEFAULT_STATE.sat ? '1' : '0'],
    ['search', stateWithMode.search, DEFAULT_STATE.search],
    ['time', String(Math.round(Number(stateWithMode.time) || 0)), String(DEFAULT_STATE.time)],
    ['play', stateWithMode.playing ? '1' : '0', DEFAULT_STATE.playing ? '1' : '0'],
    ['speed', String(Number(stateWithMode.speed) || 1), String(DEFAULT_STATE.speed)],
  ];

  entries.forEach(([key, value, fallback]) => {
    if (value == null || value === '' || value === fallback) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  url.hash = '';
  return url;
}

function parseStateFromUrl() {
  const params = new URL(window.location.href).searchParams;
  const hasParams = ['mode', 'deck', 'tour', 'founder', 'filter', 'theme', 'sidebar', 'sat', 'search', 'time', 'play', 'speed']
    .some((key) => params.has(key));

  if (!hasParams) return null;

  return {
    mode: params.get('mode') || DEFAULT_MODE,
    deck: parseBooleanParam(params.get('deck'), DEFAULT_STATE.deck),
    tour: parseBooleanParam(params.get('tour'), DEFAULT_STATE.tour),
    founder: parseBooleanParam(params.get('founder'), DEFAULT_STATE.founder),
    filter: params.get('filter') || DEFAULT_STATE.filter,
    theme: params.get('theme') || DEFAULT_STATE.theme,
    sidebarCollapsed: parseBooleanParam(params.get('sidebar'), DEFAULT_STATE.sidebarCollapsed),
    sat: parseBooleanParam(params.get('sat'), DEFAULT_STATE.sat),
    search: params.get('search') || DEFAULT_STATE.search,
    time: Number(params.get('time') || DEFAULT_STATE.time),
    playing: parseBooleanParam(params.get('play'), DEFAULT_STATE.playing),
    speed: Number(params.get('speed') || DEFAULT_STATE.speed),
  };
}

function loadSavedViews() {
  const views = readStoredJson(SAVED_VIEWS_KEY, []);
  return Array.isArray(views) ? views : [];
}

function saveViews(views) {
  writeStoredJson(SAVED_VIEWS_KEY, views.slice(0, 8));
}

function upsertSavedView(snapshot, preferredName) {
  const current = loadSavedViews();
  const name = preferredName || `View ${current.length + 1}`;
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    state: snapshot,
    createdAt: Date.now(),
  };

  const next = [item, ...current].slice(0, 8);
  saveViews(next);
  return item;
}

function deleteSavedView(viewId) {
  const next = loadSavedViews().filter((view) => view.id !== viewId);
  saveViews(next);
}

function clearSavedViews() {
  saveViews([]);
}

function inferSourceCounts() {
  const byId = (id) => normalizeCount(document.getElementById(id)?.textContent || '—');
  return {
    opensky: byId('aircraft-count'),
    usgs: byId('seismic-count'),
    firms: byId('thermal-count'),
    sigmet: byId('sigmet-count'),
    adsb_lol: byId('adsb-mil-count'),
    maritime: byId('maritime-count'),
    conflict: byId('conflict-count'),
    oil: normalizeCount(document.getElementById('oil-price')?.textContent || '—'),
  };
}

function summarizeSourceHealth() {
  const sourceHealth = { ...getSigintSourceHealth() };
  const counts = inferSourceCounts();

  if (counts.maritime !== '—') {
    sourceHealth.maritime = {
      key: 'maritime',
      label: 'Maritime AIS',
      status: 'sim',
      latencyMs: null,
      lastFetchedAt: sourceHealth.maritime?.lastFetchedAt || null,
      count: counts.maritime,
      error: null,
    };
  }

  return Object.values(sourceHealth)
    .map((entry) => ({
      ...entry,
      count: entry.count || counts[entry.key] || '—',
      age: formatAge(entry.lastFetchedAt),
      latency: formatLatency(entry.latencyMs),
    }))
    .sort((left, right) => {
      const leftIndex = HEALTH_PRIORITY.indexOf(left.key);
      const rightIndex = HEALTH_PRIORITY.indexOf(right.key);
      const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return safeLeft - safeRight;
    });
}

function createHealthPanel(bucket) {
  const panel = document.createElement('aside');
  panel.className = 'sigint-pro-health-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="sigint-pro-health-header">
      <div>
        <div class="sigint-pro-health-title">Source Health</div>
        <div class="sigint-pro-health-meta">Freshness, status, and observed latency across live feeds.</div>
      </div>
      <button type="button" class="sigint-pro-action-btn" data-role="close-health">Close</button>
    </div>
    <div id="sigint-pro-health-content"></div>
  `;
  document.body.appendChild(panel);
  bucket.push(() => panel.remove());

  const content = panel.querySelector('#sigint-pro-health-content');
  const closeBtn = panel.querySelector('[data-role="close-health"]');
  let open = false;

  const render = () => {
    const rows = summarizeSourceHealth();

    if (rows.length === 0) {
      setInnerHtmlIfChanged(content, '<div class="sigint-pro-palette-empty">Feed telemetry has not populated yet. Open the dashboard for a moment or trigger a refresh.</div>', 'health-empty');
      return;
    }

    const totalLive = rows.filter((row) => row.status === 'live').length;
    const totalProblem = rows.filter((row) => row.status === 'error').length;
    const totalSim = rows.filter((row) => row.status === 'sim').length;

    setInnerHtmlIfChanged(content, `
      <div class="sigint-pro-health-meta" style="margin-bottom:10px;">
        ${totalLive} live · ${totalProblem} error · ${totalSim} simulated
      </div>
      <table class="sigint-pro-health-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Status</th>
            <th>Fresh</th>
            <th>Latency</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>
                <div style="font-weight:600;">${escapeHtml(row.label || row.key)}</div>
                <div style="color:var(--color-text-faint);font-size:10px;">${escapeHtml(row.error || row.url || '')}</div>
              </td>
              <td><span class="sigint-pro-health-pill" data-status="${escapeHtml(row.status || 'idle')}">${escapeHtml(row.status || 'idle')}</span></td>
              <td>${escapeHtml(row.age)}</td>
              <td>${escapeHtml(row.latency)}</td>
              <td>${escapeHtml(normalizeCount(row.count))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `, { rows, totalLive, totalProblem, totalSim });
  };

  const intervalId = window.setInterval(() => {
    if (open) render();
  }, 5000);
  bucket.push(() => window.clearInterval(intervalId));

  const toggle = (force) => {
    open = typeof force === 'boolean' ? force : !open;
    panel.dataset.open = open ? 'true' : 'false';
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) render();
  };

  const onClose = () => toggle(false);
  closeBtn?.addEventListener('click', onClose);
  bucket.push(() => closeBtn?.removeEventListener?.('click', onClose));

  const onSourceHealth = () => {
    if (open) render();
  };
  window.addEventListener('sigint:source-health', onSourceHealth);
  bucket.push(() => window.removeEventListener('sigint:source-health', onSourceHealth));

  return { toggle, render, isOpen: () => open };
}

function createPalette(bucket, context) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sigint-pro-palette-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  const palette = document.createElement('section');
  palette.className = 'sigint-pro-palette';
  palette.setAttribute('role', 'dialog');
  palette.setAttribute('aria-modal', 'true');
  palette.setAttribute('aria-label', 'SIGINT command palette');
  palette.innerHTML = `
    <div class="sigint-pro-palette-header">
      <div>
        <div class="sigint-pro-palette-title">Analyst Command Palette</div>
        <div class="sigint-pro-health-meta">Fast access to modes, watch zones, workbench triage, fusion, source health, and saved views.</div>
      </div>
      <div class="sigint-pro-health-meta">Ctrl/Cmd+K</div>
    </div>
    <input type="text" class="sigint-pro-palette-input" placeholder="Search commands, filters, incidents, saved views…" autocomplete="off" spellcheck="false" />
    <div class="sigint-pro-palette-list"></div>
  `;
  document.body.appendChild(backdrop);
  document.body.appendChild(palette);
  bucket.push(() => backdrop.remove());
  bucket.push(() => palette.remove());

  const input = palette.querySelector('.sigint-pro-palette-input');
  const list = palette.querySelector('.sigint-pro-palette-list');
  let open = false;
  let activeIndex = 0;
  let currentItems = [];

  function getCommands() {
    const savedViews = loadSavedViews();
    const mode = document.body.dataset.opMode || DEFAULT_MODE;
    const liveIncidents = (context.fusionCenter?.getIncidents?.() || []).slice(0, 6);
    const watchSnapshots = (context.watchCenter?.getSnapshots?.() || []).slice(0, 6);

    return [
      { id: 'mode-analyst', label: 'Switch to Analyst mode', meta: 'Full operator layout with every control visible.', badge: mode === 'analyst' ? 'ACTIVE' : 'MODE', keywords: 'mode analyst operator full', run: () => context.setMode('analyst') },
      { id: 'mode-briefing', label: 'Switch to Briefing mode', meta: 'Executive view with reduced chrome and widened briefing rail.', badge: mode === 'briefing' ? 'ACTIVE' : 'MODE', keywords: 'mode briefing executive summary', run: () => context.setMode('briefing') },
      { id: 'mode-kiosk', label: 'Switch to Kiosk mode', meta: 'Full-screen monitoring with the sidebar suppressed.', badge: mode === 'kiosk' ? 'ACTIVE' : 'MODE', keywords: 'mode kiosk wallboard fullscreen', run: () => context.setMode('kiosk') },
      { id: 'share-link', label: 'Copy shareable analyst link', meta: 'Captures filter, time, theme, search, overlay, and mode in the URL.', badge: 'LINK', keywords: 'share link permalink snapshot url deep link', run: () => context.copyShareLink() },
      { id: 'founder-mode', label: context.showcaseSuite?.isFounderMode?.() ? 'Exit Founder mode' : 'Enter Founder mode', meta: 'Instantly switches into a cinematic briefing layout and starts the live tour.', badge: context.showcaseSuite?.isFounderMode?.() ? 'ON' : 'SHOW', keywords: 'founder mode cinematic showcase demo wow impressive', run: () => context.toggleFounderMode() },
      { id: 'showcase-caption', label: 'Copy showcase caption', meta: 'Copies a polished pulse summary with the live share link.', badge: 'COPY', keywords: 'caption social summary live link', run: () => context.copyShowcaseCaption() },
      { id: 'showcase-poster', label: 'Export showcase poster', meta: 'Downloads a cinematic SVG poster of the current pulse, watch zones, and briefing board.', badge: 'SVG', keywords: 'poster export svg snapshot deck', run: () => context.exportShowcasePoster() },
      { id: 'showcase-card', label: 'Export snapshot card', meta: 'Downloads a polished HTML snapshot card for sharing or printing.', badge: 'HTML', keywords: 'snapshot card export html share printable', run: () => context.exportShowcaseCard() },
      { id: 'save-view', label: 'Save current view', meta: 'Stores the current operational snapshot locally for rapid recall.', badge: 'SAVE', keywords: 'save current view snapshot preset favorite', run: () => context.saveCurrentView() },
      { id: 'briefing', label: 'Copy intelligence briefing', meta: 'Copies the structured intelligence briefing generated by the live app.', badge: 'BRIEF', keywords: 'copy briefing clipboard summary', run: () => context.invokeButton('#nw-copy-btn', 'Briefing copied.') },
      { id: 'health', label: 'Toggle source health panel', meta: 'Inspect freshness, status, and latency of live feeds.', badge: context.healthPanel.isOpen() ? 'OPEN' : 'HEALTH', keywords: 'health source freshness latency status panel', run: () => context.toggleHealth() },
      { id: 'deck', label: 'Toggle command deck', meta: 'Open the polished pulse view for lead incidents, watch hotspots, and recent activity.', badge: context.executiveDeck?.isOpen?.() ? 'OPEN' : 'DECK', keywords: 'command deck pulse executive summary spotlight', run: () => context.toggleDeck() },
      { id: 'deck-tour', label: context.executiveDeck?.isTouring?.() ? 'Pause cinematic tour' : 'Start cinematic tour', meta: 'Auto-focus the strongest live incidents with a polished briefing spotlight.', badge: context.executiveDeck?.isTouring?.() ? 'PAUSE' : 'TOUR', keywords: 'tour cinematic focus spotlight autoplay incidents', run: () => context.toggleTour() },
      { id: 'deck-digest', label: 'Copy command deck digest', meta: 'Copies pulse, lead incidents, watch hotspots, and recent activity.', badge: 'DECK', keywords: 'command deck digest executive pulse copy', run: () => context.copyExecutiveDigest() },
      { id: 'fusion', label: 'Toggle fusion center', meta: 'Rank corroborated incidents across feeds by priority and confidence.', badge: context.fusionCenter?.isOpen?.() ? 'OPEN' : 'FUSE', keywords: 'fusion center corroboration incident ranking', run: () => context.toggleFusion() },
      { id: 'fusion-digest', label: 'Copy fusion digest', meta: 'Copies the highest-priority corroborated incidents to the clipboard.', badge: 'DIGEST', keywords: 'fusion digest copy summary incidents', run: () => context.copyFusionDigest() },
      { id: 'watch-center', label: 'Toggle Watch Center', meta: 'Track geo-fenced regions and alert on new corroborated incidents.', badge: context.watchCenter?.isOpen?.() ? 'OPEN' : 'WATCH', keywords: 'watch center region zone geofence alert', run: () => context.toggleWatch() },
      { id: 'watch-digest', label: 'Copy watch digest', meta: 'Copies active watch zones with their top hits and delta counts.', badge: 'ZONE', keywords: 'watch digest zone copy geofence region', run: () => context.copyWatchDigest() },
      { id: 'watch-clear', label: 'Clear watch zones', meta: 'Removes locally stored watch zones from this browser.', badge: 'CLR', keywords: 'clear watch zones geofence region', run: () => context.clearWatchZones() },
      { id: 'workbench', label: 'Toggle Ops Workbench', meta: 'Curate incidents, compare against a baseline, and manage the briefing queue.', badge: context.opsWorkbench?.isOpen?.() ? 'OPEN' : 'OPS', keywords: 'ops workbench triage baseline delta brief board', run: () => context.toggleWorkbench() },
      { id: 'workbench-copy', label: 'Copy markdown operational brief', meta: 'Exports the curated briefing board and delta summary.', badge: 'MD', keywords: 'ops workbench copy markdown brief export', run: () => context.copyWorkbenchBrief() },
      { id: 'baseline-capture', label: 'Capture delta baseline', meta: 'Freeze the current fused picture so later changes are obvious.', badge: 'BASE', keywords: 'baseline delta capture compare snapshot', run: () => context.captureWorkbenchBaseline() },
      { id: 'baseline-clear', label: 'Clear delta baseline', meta: 'Remove the stored baseline and start a fresh comparison.', badge: 'CLR', keywords: 'clear remove baseline delta', run: () => context.clearWorkbenchBaseline() },
      { id: 'brief-clear', label: 'Clear briefing board', meta: 'Remove all curated brief items from the Ops Workbench.', badge: 'CLR', keywords: 'clear remove briefing board workbench', run: () => context.clearWorkbenchBrief() },
      { id: 'notifications', label: 'Toggle analyst notifications', meta: 'Enable or disable browser alerts for high-signal events.', badge: 'ALERT', keywords: 'notifications browser alerts bell', run: () => context.invokeButton('#nw-bell-btn', 'Notification toggle sent.') },
      { id: 'geolocate', label: 'Center on my location', meta: 'Uses the browser geolocation API and focuses the nearest event.', badge: 'GEO', keywords: 'geolocate locate my position', run: () => context.invokeButton('#nw-geo-btn', 'Geolocation requested.') },
      { id: 'perf', label: 'Toggle performance overlay', meta: 'Surface FPS, long tasks, and session telemetry for debugging.', badge: 'FPS', keywords: 'performance fps diagnostics telemetry overlay', run: () => context.togglePerformance() },
      { id: 'sidebar', label: 'Toggle sidebar', meta: 'Show or hide the analyst rail.', badge: 'UI', keywords: 'sidebar collapse expand rail', run: () => context.invokeButton('#sidebar-toggle') },
      { id: 'theme', label: 'Toggle theme', meta: 'Swap the analyst theme between dark and light.', badge: 'THEME', keywords: 'theme dark light', run: () => context.invokeButton('#theme-toggle') },
      { id: 'satellite', label: 'Toggle satellite overlay', meta: 'Boost thermal hotspot visibility for fires and strikes.', badge: 'SAT', keywords: 'satellite gibs thermal overlay', run: () => context.invokeButton('#sat-toggle') },
      { id: 'reset', label: 'Reset camera and timeline', meta: 'Returns the globe to the default theater view.', badge: 'RESET', keywords: 'reset camera timeline default view', run: () => context.resetView() },
      { id: 'clear-saved', label: 'Clear saved views', meta: 'Removes locally stored analyst snapshots from this browser.', badge: 'DANGER', keywords: 'clear delete remove saved views', run: () => { clearSavedViews(); context.showToast('Saved views cleared.', 'warning'); render(); } },
      ...['all', 'air', 'naval', 'strikes', 'impacts', 'intercepts', 'seismic', 'thermal', 'nuclear', 'maritime', 'weather', 'radiation', 'conflict'].map((filter) => ({
        id: `filter-${filter}`, label: `Filter: ${filter}`, meta: `Jump directly to the ${filter} picture.`, badge: 'FILTER', keywords: `filter ${filter}`, run: () => context.setFilter(filter),
      })),
      ...liveIncidents.flatMap((incident) => ([
        { id: `incident-focus-${incident.id}`, label: `Focus incident: ${incident.title}`, meta: `${incident.priority} · ${incident.sourceCount} sources · ${incident.domains.join(' + ')}`, badge: incident.priority || 'LIVE', keywords: `incident focus ${incident.title} ${(incident.domains || []).join(' ')} ${(incident.sources || []).join(' ')}`, run: () => context.focusIncident(incident) },
        { id: `incident-track-${incident.id}`, label: `Track zone: ${incident.title}`, meta: `Create a geo-fenced watch around ${incident.title}.`, badge: 'WATCH', keywords: `track zone watch ${incident.title}`, run: () => context.addWatchZoneFromIncident(incident) },
      ])),
      ...watchSnapshots.map((snapshot) => ({
        id: `watch-focus-${snapshot.zone.id}`,
        label: `Focus zone: ${snapshot.zone.name}`,
        meta: `${snapshot.activeCount} active · ${snapshot.newHits.length} new · ${snapshot.zone.radiusKm} km · ${snapshot.zone.domain}`,
        badge: snapshot.activeCount ? (snapshot.hot ? 'HOT' : 'ZONE') : 'QUIET',
        keywords: `watch zone ${snapshot.zone.name} ${snapshot.zone.domain} ${snapshot.zone.minPriority}`,
        run: () => context.focusWatchZone(snapshot.zone.id),
      })),
      ...savedViews.flatMap((view) => ([
        { id: `saved-${view.id}`, label: `Saved view: ${view.name}`, meta: `Snapshot from ${new Date(view.createdAt).toLocaleString()}`, badge: 'SAVED', keywords: `saved view ${view.name}`, run: () => { if (view.state?.mode) context.setMode(view.state.mode, { silent: true }); applyState(view.state || {}); context.applyAuxiliaryState?.(view.state || {}); context.syncUrlNow(); context.showToast(`Loaded “${view.name}”.`, 'success'); } },
        { id: `delete-saved-${view.id}`, label: `Delete saved view: ${view.name}`, meta: 'Removes this saved analyst snapshot from local storage.', badge: 'DEL', keywords: `delete remove saved view ${view.name}`, run: () => { deleteSavedView(view.id); context.showToast(`Deleted “${view.name}”.`, 'warning'); render(); } },
      ])),
    ];
  }

  function render() {
    const query = (input.value || '').trim().toLowerCase();
    const commands = getCommands();
    currentItems = commands.filter((command) => !query || `${command.label} ${command.meta} ${command.keywords || ''}`.toLowerCase().includes(query));

    if (!currentItems.length) {
      setInnerHtmlIfChanged(list, '<div class="sigint-pro-palette-empty">No command matched. Try “fusion”, “health”, “filter”, or “saved”.</div>', `palette-empty:${query}`);
      activeIndex = 0;
      return;
    }

    activeIndex = Math.min(activeIndex, currentItems.length - 1);

    setInnerHtmlIfChanged(list, currentItems.map((item, index) => `
      <button type="button" class="sigint-pro-palette-item" data-index="${index}" data-active="${index === activeIndex ? 'true' : 'false'}">
        <span>
          <span class="sigint-pro-palette-item__label">${escapeHtml(item.label)}</span>
          <span class="sigint-pro-palette-item__meta">${escapeHtml(item.meta || '')}</span>
        </span>
        <span style="display:flex;align-items:center;gap:6px;">
          <span class="sigint-pro-palette-item__badge">${escapeHtml(item.badge || 'GO')}</span>
        </span>
      </button>
    `).join(''), stableSerialize({
      query,
      activeIndex,
      items: currentItems.map((item) => ({
        id: item.id,
        label: item.label,
        meta: item.meta,
        badge: item.badge,
      })),
    }));
  }

  function execute(item) {
    if (!item) return;
    close();
    item.run();
  }

  function openPalette() {
    open = true;
    backdrop.dataset.open = 'true';
    palette.dataset.open = 'true';
    backdrop.setAttribute('aria-hidden', 'false');
    activeIndex = 0;
    input.value = '';
    render();
    window.setTimeout(() => input.focus(), 0);
  }

  function close() {
    open = false;
    backdrop.dataset.open = 'false';
    palette.dataset.open = 'false';
    backdrop.setAttribute('aria-hidden', 'true');
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(currentItems.length - 1, 0));
      render();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      execute(currentItems[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('.sigint-pro-palette-item');
    if (!button) return;
    execute(currentItems[Number(button.dataset.index || 0)]);
  });

  backdrop.addEventListener('click', close);

  const onGlobalKeyDown = (event) => {
    const usingCommandPaletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (usingCommandPaletteShortcut) {
      event.preventDefault();
      if (open) close();
      else openPalette();
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  document.addEventListener('keydown', onGlobalKeyDown);
  bucket.push(() => document.removeEventListener('keydown', onGlobalKeyDown));
  bucket.push(() => input.removeEventListener('input', render));
  bucket.push(() => backdrop.removeEventListener('click', close));

  return { open: openPalette, close, render, isOpen: () => open };
}


function createToolbar(bucket, context) {
  const host = document.querySelector('.controls-bar__right');
  if (!host) return null;

  const toolbar = document.createElement('div');
  toolbar.className = 'sigint-pro-toolbar';
  toolbar.innerHTML = `
    <div class="sigint-pro-mode-group" aria-label="Operational modes">
      <button type="button" class="sigint-pro-mode-btn" data-mode="analyst">Analyst</button>
      <button type="button" class="sigint-pro-mode-btn" data-mode="briefing">Brief</button>
      <button type="button" class="sigint-pro-mode-btn" data-mode="kiosk">Kiosk</button>
    </div>
    <button type="button" class="sigint-pro-action-btn" data-role="share"><span>Share</span><span class="sigint-pro-action-btn__hint">URL</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="showcase"><span>Show</span><span class="sigint-pro-action-btn__hint">F</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="deck"><span>Deck</span><span class="sigint-pro-action-btn__hint">0</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="health"><span>Health</span><span class="sigint-pro-action-btn__hint">Live</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="fusion"><span>Fusion</span><span class="sigint-pro-action-btn__hint">0</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="watch"><span>Watch</span><span class="sigint-pro-action-btn__hint">0</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="workbench"><span>Ops</span><span class="sigint-pro-action-btn__hint">0</span></button>
    <button type="button" class="sigint-pro-action-btn" data-role="palette"><span>Cmd</span><span class="sigint-pro-action-btn__hint">Ctrl+K</span></button>
  `;

  host.prepend(toolbar);
  bucket.push(() => toolbar.remove());

  const modeButtons = Array.from(toolbar.querySelectorAll('.sigint-pro-mode-btn'));
  const shareButton = toolbar.querySelector('[data-role="share"]');
  const showcaseButton = toolbar.querySelector('[data-role="showcase"]');
  const deckButton = toolbar.querySelector('[data-role="deck"]');
  const deckHint = deckButton?.querySelector('.sigint-pro-action-btn__hint') || null;
  const healthButton = toolbar.querySelector('[data-role="health"]');
  const fusionButton = toolbar.querySelector('[data-role="fusion"]');
  const fusionHint = fusionButton?.querySelector('.sigint-pro-action-btn__hint') || null;
  const watchButton = toolbar.querySelector('[data-role="watch"]');
  const watchHint = watchButton?.querySelector('.sigint-pro-action-btn__hint') || null;
  const workbenchButton = toolbar.querySelector('[data-role="workbench"]');
  const workbenchHint = workbenchButton?.querySelector('.sigint-pro-action-btn__hint') || null;
  const paletteButton = toolbar.querySelector('[data-role="palette"]');

  const updateModeButtons = (mode) => {
    modeButtons.forEach((button) => {
      button.dataset.active = button.dataset.mode === mode ? 'true' : 'false';
    });
  };

  const updateShowcaseButton = () => {
    if (!showcaseButton) return;
    showcaseButton.dataset.active = context.showcaseSuite?.isFounderMode?.() ? 'true' : 'false';
  };

  const updateDeckButton = (summary = context.executiveDeck?.getSummary?.() || { score: 0, touring: false }) => {
    if (!deckButton) return;
    deckButton.dataset.active = context.executiveDeck?.isOpen?.() ? 'true' : 'false';
    if (deckHint) {
      deckHint.textContent = summary.touring ? `${summary.score || 0}/T` : String(summary.score || 0);
    }
  };

  const updateHealthButton = () => {
    healthButton.dataset.active = context.healthPanel.isOpen() ? 'true' : 'false';
  };

  const updateFusionButton = (summary = context.fusionCenter?.getSummary?.() || { total: 0, watchlisted: 0 }) => {
    if (!fusionButton) return;
    fusionButton.dataset.active = context.fusionCenter?.isOpen?.() ? 'true' : 'false';
    if (fusionHint) {
      fusionHint.textContent = summary.watchlisted > 0 ? `${summary.total}/${summary.watchlisted}` : String(summary.total || 0);
    }
  };

  const updateWatchButton = (summary = context.watchCenter?.getSummary?.() || { zones: 0, hot: 0, newHits: 0 }) => {
    if (!watchButton) return;
    watchButton.dataset.active = context.watchCenter?.isOpen?.() ? 'true' : 'false';
    if (watchHint) {
      watchHint.textContent = summary.newHits > 0 ? `${summary.zones || 0}/${summary.newHits}` : String(summary.zones || 0);
    }
  };

  const updateWorkbenchButton = (summary = context.opsWorkbench?.getSummary?.() || { briefed: 0, new: 0, escalated: 0 }) => {
    if (!workbenchButton) return;
    workbenchButton.dataset.active = context.opsWorkbench?.isOpen?.() ? 'true' : 'false';
    if (workbenchHint) {
      const deltaCount = (summary.new || 0) + (summary.escalated || 0);
      workbenchHint.textContent = deltaCount > 0 ? `${summary.briefed || 0}/${deltaCount}` : String(summary.briefed || 0);
    }
  };

  modeButtons.forEach((button) => {
    const onClick = () => context.setMode(button.dataset.mode);
    button.addEventListener('click', onClick);
    bucket.push(() => button.removeEventListener('click', onClick));
  });

  const onShare = () => context.copyShareLink();
  const onShowcase = () => { context.toggleFounderMode(); updateShowcaseButton(); updateDeckButton(); };
  const onDeck = () => { context.toggleDeck(); updateDeckButton(); };
  const onHealth = () => { context.toggleHealth(); updateHealthButton(); };
  const onFusion = () => { context.toggleFusion(); updateFusionButton(); };
  const onWatch = () => { context.toggleWatch(); updateWatchButton(); };
  const onWorkbench = () => { context.toggleWorkbench(); updateWorkbenchButton(); };
  const onPalette = () => context.palette.open();

  shareButton.addEventListener('click', onShare);
  showcaseButton?.addEventListener('click', onShowcase);
  deckButton?.addEventListener('click', onDeck);
  healthButton.addEventListener('click', onHealth);
  fusionButton?.addEventListener('click', onFusion);
  watchButton?.addEventListener('click', onWatch);
  workbenchButton?.addEventListener('click', onWorkbench);
  paletteButton.addEventListener('click', onPalette);

  bucket.push(() => shareButton.removeEventListener('click', onShare));
  bucket.push(() => showcaseButton?.removeEventListener('click', onShowcase));
  bucket.push(() => deckButton?.removeEventListener('click', onDeck));
  bucket.push(() => healthButton.removeEventListener('click', onHealth));
  bucket.push(() => fusionButton?.removeEventListener('click', onFusion));
  bucket.push(() => watchButton?.removeEventListener('click', onWatch));
  bucket.push(() => workbenchButton?.removeEventListener('click', onWorkbench));
  bucket.push(() => paletteButton.removeEventListener('click', onPalette));

  updateModeButtons(document.body.dataset.opMode || DEFAULT_MODE);
  updateShowcaseButton();
  updateDeckButton();
  updateHealthButton();
  updateFusionButton();
  updateWatchButton();
  updateWorkbenchButton();

  return { updateModeButtons, updateShowcaseButton, updateDeckButton, updateHealthButton, updateFusionButton, updateWatchButton, updateWorkbenchButton };
}

export function enhanceLegacyApp() {
  if (window.__SIGINT_MAP_GROUNDBREAKING__) {
    return window.__SIGINT_MAP_GROUNDBREAKING_CLEANUP__ || (() => {});
  }

  const bucket = createCleanupBucket();
  injectStyles(bucket);
  const showToast = createToastHost(bucket);

  let currentMode = DEFAULT_MODE;
  let syncingFromUrl = false;
  let toolbar = null;
  let executiveDeck = null;
  let opsWorkbench = null;
  let watchCenter = null;
  let showcaseSuite = null;

  const setMode = (mode, options = {}) => {
    const nextMode = ['analyst', 'briefing', 'kiosk'].includes(mode) ? mode : DEFAULT_MODE;
    const { silent = false, persist = true } = options;

    currentMode = nextMode;
    document.body.dataset.opMode = nextMode;

    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const isCollapsed = sidebar?.classList.contains('collapsed') || false;

    if (nextMode === 'kiosk' && !isCollapsed) {
      sidebarToggle?.click();
    }

    if ((nextMode === 'analyst' || nextMode === 'briefing') && isCollapsed) {
      sidebarToggle?.click();
    }

    if (persist) {
      writeStoredString(MODE_STORAGE_KEY, nextMode);
    }

    toolbar?.updateModeButtons(nextMode);
    executiveDeck?.render?.();

    if (!silent) {
      showToast(`${nextMode[0].toUpperCase()}${nextMode.slice(1)} mode active.`, 'success');
    }

    syncUrl();
  };

  const captureShareState = () => ({
    ...captureState(),
    mode: currentMode,
    deck: executiveDeck?.isOpen?.() || false,
    tour: executiveDeck?.isTouring?.() || false,
    founder: showcaseSuite?.isFounderMode?.() || false,
  });

  const applyAuxiliaryState = (state = {}) => {
    if (state?.founder) {
      showcaseSuite?.setFounderMode?.(true, { silent: true, syncUrl: false });
      return;
    }

    showcaseSuite?.setFounderMode?.(false, { silent: true, syncUrl: false });

    if (typeof state?.deck === 'boolean') {
      if (state.deck) executiveDeck?.open?.();
      else executiveDeck?.close?.();
    }

    if (typeof state?.tour === 'boolean') {
      if (state.tour) executiveDeck?.startTour?.();
      else executiveDeck?.stopTour?.();
    }
  };

  const copyShareLink = async () => {
    const url = serializeStateToUrl(captureShareState());
    const link = url.toString();

    try {
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({
          title: 'SIGINT-MAP Analyst View',
          text: 'Open this SIGINT-MAP analyst snapshot.',
          url: link,
        });
      } else {
        await copyText(link);
      }

      showToast('Shareable analyst link copied.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Share link failed:', error);
      showToast('Unable to copy the analyst link.', 'danger');
    }
  };

  const toggleHealth = () => {
    healthPanel.toggle();
    toolbar?.updateHealthButton();
  };

  const toggleDeck = () => {
    executiveDeck?.toggle?.();
    toolbar?.updateShowcaseButton?.();
    toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
  };

  const toggleTour = () => {
    executiveDeck?.toggleTour?.();
    toolbar?.updateShowcaseButton?.();
    toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
  };

  const copyExecutiveDigest = () => {
    executiveDeck?.copyDigest?.();
  };

  const toggleFounderMode = () => {
    showcaseSuite?.toggleFounderMode?.();
    toolbar?.updateShowcaseButton?.();
    toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
  };

  const copyShowcaseCaption = () => {
    showcaseSuite?.copyCaption?.();
  };

  const exportShowcasePoster = () => {
    showcaseSuite?.exportPoster?.();
  };

  const exportShowcaseCard = () => {
    showcaseSuite?.exportSnapshotCard?.();
  };

  const toggleFusion = () => {
    fusionCenter.toggle();
    toolbar?.updateFusionButton(fusionCenter.getSummary());
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };

  const copyFusionDigest = () => {
    fusionCenter.copyDigest();
  };

  const focusIncident = (incident) => {
    const api = getPublicApi();
    api.focusLocation?.(incident.lat, incident.lon, {
      title: incident.title,
      detail: `${incident.priority} | Confidence ${incident.confidence} | ${incident.summary}`,
      domain: incident.dominantDomain || 'fusion',
      status: `${incident.priority} / Confidence ${incident.confidence}`,
      source: (incident.sources || []).join(', '),
      url: incident.primaryUrl || '',
      lat: incident.lat,
      lon: incident.lon,
    });
  };

  const toggleWatch = () => {
    watchCenter?.toggle?.();
    toolbar?.updateWatchButton?.(watchCenter?.getSummary?.());
  };

  const copyWatchDigest = () => {
    watchCenter?.copyDigest?.();
  };

  const clearWatchZones = () => {
    watchCenter?.clearZones?.();
    toolbar?.updateWatchButton?.(watchCenter?.getSummary?.());
  };

  const addWatchZoneFromIncident = (incident) => {
    watchCenter?.addZoneFromIncident?.(incident);
    toolbar?.updateWatchButton?.(watchCenter?.getSummary?.());
  };

  const focusWatchZone = (zoneId) => {
    const snapshots = watchCenter?.getSnapshots?.() || [];
    const snapshot = snapshots.find((entry) => entry.zone?.id === zoneId);
    if (!snapshot) {
      showToast('Watch zone not available in this session.', 'warning');
      return;
    }
    watchCenter?.focusZone?.(zoneId);
  };

  const toggleWorkbench = () => {
    opsWorkbench?.toggle?.();
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };

  const copyWorkbenchBrief = () => {
    opsWorkbench?.copyBriefingMarkdown?.();
  };

  const captureWorkbenchBaseline = () => {
    opsWorkbench?.captureBaseline?.();
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };

  const clearWorkbenchBaseline = () => {
    opsWorkbench?.clearBaseline?.();
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };

  const clearWorkbenchBrief = () => {
    opsWorkbench?.clearBrief?.();
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };

  const addBriefItem = (incident) => {
    opsWorkbench?.addBriefItem?.(incident);
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };

  const invokeButton = (selector, successMessage) => {
    const button = document.querySelector(selector);
    if (!button) {
      showToast(`Control not available: ${selector}`, 'warning');
      return;
    }

    button.click();
    if (successMessage) showToast(successMessage, 'success');
    syncUrl();
  };

  const resetView = () => {
    const api = getPublicApi();
    if (typeof api.resetView === 'function') {
      api.resetView();
      showToast('Default theater view restored.', 'success');
      syncUrl();
      return;
    }

    invokeButton('#sidebar-toggle');
  };

  const setFilter = (filter) => {
    window.setCurrentFilter?.(filter);
    showToast(`Filter set to ${filter}.`, 'success');
    syncUrl();
  };

  const togglePerformance = () => {
    const api = getPublicApi();
    if (typeof api.togglePerformance === 'function') {
      api.togglePerformance();
      showToast('Performance overlay toggled.', 'success');
      return;
    }
    showToast('Performance overlay API not exposed in this build.', 'warning');
  };

  const saveCurrentView = async () => {
    const snapshot = captureShareState();
    const suggestedName = `View ${loadSavedViews().length + 1}`;
    const name = await requestGlassPrompt(bucket, {
      eyebrow: 'Analyst snapshot',
      title: 'Save this live view',
      message: 'Capture the current filters, timeline, overlays, and mode so you can recall the exact picture instantly.',
      defaultValue: suggestedName,
      placeholder: 'Snapshot name',
      confirmLabel: 'Save snapshot',
      cancelLabel: 'Cancel',
      maxLength: 72,
    });
    if (!name?.trim()) return;
    upsertSavedView(snapshot, name.trim());
    showToast(`Saved “${name.trim()}”.`, 'success');
    palette.render();
  };

  const syncUrlNow = () => {
    const url = serializeStateToUrl(captureShareState());
    window.history.replaceState({}, '', url);
  };

  const syncUrl = debounce(() => {
    if (syncingFromUrl) return;
    syncUrlNow();
  }, 120);
  bucket.push(() => syncUrl.cancel?.());

  const healthPanel = createHealthPanel(bucket);
  const fusionCenter = createFusionCenter(bucket, {
    setFilter,
    showToast,
    addWatchZone: (incident) => addWatchZoneFromIncident(incident),
    addBriefItem: (incident) => opsWorkbench?.addBriefItem?.(incident),
    isBriefed: (incidentId) => opsWorkbench?.isBriefed?.(incidentId),
    onSummaryChange: (summary) => toolbar?.updateFusionButton(summary),
  });
  opsWorkbench = createOpsWorkbench(bucket, {
    setFilter,
    showToast,
    onSummaryChange: (summary) => toolbar?.updateWorkbenchButton(summary),
  });
  watchCenter = createWatchCenter(bucket, {
    setFilter,
    showToast,
    getIncidents: () => fusionCenter.getIncidents(),
    addBriefItem: (incident) => opsWorkbench?.addBriefItem?.(incident),
    onSummaryChange: (summary) => toolbar?.updateWatchButton(summary),
  });
  executiveDeck = createExecutiveDeck(bucket, {
    showToast,
    saveCurrentView,
    copyWorkbenchBrief,
    addWatchZoneFromIncident,
    addBriefItem,
    focusIncident,
    focusWatchZone,
    copyShowcaseCaption,
    exportShowcasePoster,
    exportShowcaseCard,
    toggleFounderMode,
    isFounderMode: () => showcaseSuite?.isFounderMode?.() || false,
    fusionCenter,
    watchCenter,
    opsWorkbench,
    onSummaryChange: (summary) => toolbar?.updateDeckButton?.(summary),
  });
  showcaseSuite = createShowcaseSuite(bucket, {
    showToast,
    setMode,
    getMode: () => currentMode,
    focusIncident,
    executiveDeck,
    fusionCenter,
    watchCenter,
    opsWorkbench,
    syncUrlNow,
    getShareUrl: () => serializeStateToUrl(captureShareState()).toString(),
    onFounderModeChange: () => {
      toolbar?.updateShowcaseButton?.();
      toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
    },
  });
  const palette = createPalette(bucket, {
    setMode,
    toggleHealth,
    toggleDeck,
    toggleTour,
    toggleFounderMode,
    copyExecutiveDigest,
    copyShowcaseCaption,
    exportShowcasePoster,
    exportShowcaseCard,
    toggleFusion,
    copyFusionDigest,
    toggleWatch,
    copyWatchDigest,
    clearWatchZones,
    addWatchZoneFromIncident,
    focusWatchZone,
    focusIncident,
    toggleWorkbench,
    copyWorkbenchBrief,
    captureWorkbenchBaseline,
    clearWorkbenchBaseline,
    clearWorkbenchBrief,
    copyShareLink,
    saveCurrentView,
    invokeButton,
    resetView,
    setFilter,
    togglePerformance,
    showToast,
    healthPanel,
    showcaseSuite,
    executiveDeck,
    fusionCenter,
    watchCenter,
    opsWorkbench,
    syncUrlNow,
    applyAuxiliaryState,
  });
  toolbar = createToolbar(bucket, {
    setMode,
    copyShareLink,
    toggleFounderMode,
    toggleDeck,
    toggleHealth,
    toggleFusion,
    toggleWatch,
    toggleWorkbench,
    palette,
    healthPanel,
    showcaseSuite,
    executiveDeck,
    fusionCenter,
    watchCenter,
    opsWorkbench,
  });

  const initialMode = readStoredString(MODE_STORAGE_KEY, DEFAULT_MODE) || DEFAULT_MODE;
  setMode(initialMode, { silent: true });
  toolbar?.updateShowcaseButton?.();
  toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
  toolbar?.updateFusionButton(fusionCenter.getSummary());
  toolbar?.updateWatchButton?.(watchCenter?.getSummary?.());
  toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());

  const initialState = parseStateFromUrl();
  if (initialState) {
    syncingFromUrl = true;
    setMode(initialState.mode || initialMode, { silent: true, persist: true });
    window.setTimeout(() => {
      applyState(initialState);
      applyAuxiliaryState(initialState);
      toolbar?.updateShowcaseButton?.();
      toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
      syncingFromUrl = false;
      syncUrlNow();
      showToast('Analyst snapshot restored from URL.', 'success');
    }, 350);
  } else {
    syncUrlNow();
  }

  const syncTriggers = [
    ['#theme-toggle', 'click'],
    ['#sidebar-toggle', 'click'],
    ['#sat-toggle', 'click'],
    ['#time-slider', 'input'],
    ['#time-play', 'click'],
    ['#search-input', 'input'],
    ['#filter-bar', 'click'],
  ];

  syncTriggers.forEach(([selector, eventName]) => {
    const element = document.querySelector(selector);
    if (!element) return;
    const listener = () => syncUrl();
    element.addEventListener(eventName, listener);
    bucket.push(() => element.removeEventListener(eventName, listener));
  });

  const onPopState = () => {
    const state = parseStateFromUrl();
    if (!state) return;
    syncingFromUrl = true;
    setMode(state.mode || DEFAULT_MODE, { silent: true, persist: false });
    applyState(state);
    applyAuxiliaryState(state);
    syncingFromUrl = false;
    toolbar?.updateModeButtons(document.body.dataset.opMode || currentMode);
    toolbar?.updateShowcaseButton?.();
    toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
    showToast('Analyst snapshot reapplied from browser history.', 'success');
  };
  window.addEventListener('popstate', onPopState);
  bucket.push(() => window.removeEventListener('popstate', onPopState));

  const onSourceHealth = () => {
    toolbar?.updateShowcaseButton?.();
    toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
    toolbar?.updateHealthButton();
    toolbar?.updateFusionButton(fusionCenter.getSummary());
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };
  const onWorkbenchUpdate = () => {
    toolbar?.updateShowcaseButton?.();
    toolbar?.updateDeckButton?.(executiveDeck?.getSummary?.());
    toolbar?.updateWorkbenchButton?.(opsWorkbench?.getSummary?.());
  };
  window.addEventListener('sigint:source-health', onSourceHealth);
  window.addEventListener('sigint:ops-workbench-update', onWorkbenchUpdate);
  bucket.push(() => window.removeEventListener('sigint:source-health', onSourceHealth));
  bucket.push(() => window.removeEventListener('sigint:ops-workbench-update', onWorkbenchUpdate));

  window.__SIGINT_MAP_GROUNDBREAKING__ = true;
  window.__SIGINT_MAP_GROUNDBREAKING_CLEANUP__ = () => {
    if (!window.__SIGINT_MAP_GROUNDBREAKING__) return;
    bucket.run();
    delete window.__SIGINT_MAP_GROUNDBREAKING__;
    delete window.__SIGINT_MAP_GROUNDBREAKING_CLEANUP__;
  };

  return window.__SIGINT_MAP_GROUNDBREAKING_CLEANUP__;
}
