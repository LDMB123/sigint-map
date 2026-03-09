import { requestGlassPrompt } from './glass-prompt.js';
import {
  copyText,
  dispatchSigintEvent,
  escapeHtml,
  formatAge,
  formatCoords,
  formatTimestamp,
  getSigintFusionApi as getFusionApi,
  getSigintPublicApi as getPublicApi,
  getSigintSourceHealth as getSourceHealth,
  readStoredFlag,
  readStoredJson,
  readStoredString,
  setInnerHtmlIfChanged,
  setTextContentIfChanged,
  stableSerialize,
  writeStoredFlag,
  writeStoredJson,
  writeStoredString,
} from './shared-utils.js';
const BRIEF_STORAGE_KEY = 'sigint-map:brief-items:v1';
const BASELINE_STORAGE_KEY = 'sigint-map:ops-baseline:v1';
const PANEL_OPEN_STORAGE_KEY = 'sigint-map:ops-workbench-open:v1';
const ACTIVE_TAB_STORAGE_KEY = 'sigint-map:ops-workbench-tab:v1';

const PRIORITY_WEIGHT = {
  P1: 3,
  P2: 2,
  P3: 1,
};

const STALE_THRESHOLDS_MINUTES = {
  opensky: 15,
  adsb_lol: 15,
  usgs: 60,
  firms: 180,
  gdelt: 180,
  sigmet: 90,
  weather: 90,
  marine: 90,
  safecast: 360,
  openradiation: 360,
  conflict: 180,
  maritime: 90,
  oil: 360,
  news: 180,
  milnews: 180,
  regional_news: 180,
};

function priorityWeight(priority) {
  return PRIORITY_WEIGHT[String(priority || '').toUpperCase()] || 0;
}

function sortIncidentLike(left, right) {
  return priorityWeight(right.priority) - priorityWeight(left.priority)
    || (Number(right.score) || 0) - (Number(left.score) || 0)
    || (Number(right.confidence) || 0) - (Number(left.confidence) || 0)
    || (right.freshestTimestamp || 0) - (left.freshestTimestamp || 0);
}

function snapshotIncident(incident, previous = null) {
  const stableUpdatedAt = Number(incident?.freshestTimestamp) || Number(previous?.updatedAt) || Date.now();
  const next = {
    id: String(incident?.id || ''),
    title: String(incident?.title || 'Corroborated activity'),
    priority: String(incident?.priority || 'P3').toUpperCase(),
    confidence: Number(incident?.confidence) || 0,
    score: Number(incident?.score) || 0,
    summary: String(incident?.summary || ''),
    lat: Number(incident?.lat) || 0,
    lon: Number(incident?.lon) || 0,
    domains: Array.isArray(incident?.domains) ? incident.domains : [],
    sources: Array.isArray(incident?.sources) ? incident.sources : [],
    freshnessLabel: String(incident?.freshnessLabel || '—'),
    freshestTimestamp: Number(incident?.freshestTimestamp) || null,
    primaryUrl: String(incident?.primaryUrl || ''),
    updatedAt: stableUpdatedAt,
  };

  if (previous && typeof previous === 'object') {
    return {
      ...next,
      briefNote: previous.briefNote || '',
      addedAt: previous.addedAt || next.updatedAt,
    };
  }

  return {
    ...next,
    briefNote: '',
    addedAt: next.updatedAt,
  };
}

function computeDelta(currentIncidents, baseline) {
  if (!baseline?.capturedAt || !Array.isArray(baseline?.incidents)) {
    return {
      new: [],
      escalated: [],
      resolved: [],
      baselineCapturedAt: null,
    };
  }

  const baselineItems = baseline.incidents;
  const baselineMap = new Map(baselineItems.map((incident) => [incident.id, incident]));
  const currentMap = new Map(currentIncidents.map((incident) => [incident.id, incident]));

  const newIncidents = currentIncidents.filter((incident) => !baselineMap.has(incident.id));
  const escalated = currentIncidents.filter((incident) => {
    const previous = baselineMap.get(incident.id);
    if (!previous) return false;
    const priorityImproved = priorityWeight(incident.priority) > priorityWeight(previous.priority);
    const scoreImproved = (incident.score || 0) - (previous.score || 0) >= 6;
    const confidenceImproved = (incident.confidence || 0) - (previous.confidence || 0) >= 10;
    return priorityImproved || scoreImproved || confidenceImproved;
  });
  const resolved = baselineItems.filter((incident) => !currentMap.has(incident.id));

  return {
    new: newIncidents.sort(sortIncidentLike),
    escalated: escalated.sort(sortIncidentLike),
    resolved: resolved.sort(sortIncidentLike),
    baselineCapturedAt: baseline.capturedAt,
  };
}

function detectCollectionGaps(sourceHealth) {
  return Object.values(sourceHealth || {})
    .map((entry) => {
      const ageMinutes = entry.lastFetchedAt ? Math.max(0, (Date.now() - entry.lastFetchedAt) / 60000) : null;
      const threshold = STALE_THRESHOLDS_MINUTES[entry.key] || 180;
      const gap = entry.status === 'error'
        || (entry.status === 'connecting' && entry.pending > 0)
        || (Number.isFinite(ageMinutes) && ageMinutes > threshold);
      return {
        key: entry.key,
        label: entry.label || entry.key,
        status: entry.status || 'idle',
        error: entry.error || '',
        ageMinutes,
        ageLabel: formatAge(entry.lastFetchedAt),
        threshold,
        isGap: gap,
      };
    })
    .filter((entry) => entry.isGap)
    .sort((left, right) => Number(right.ageMinutes || 0) - Number(left.ageMinutes || 0));
}

function buildMarkdownBrief(summary, briefItems, delta, mode) {
  const lines = [
    '# SIGINT-MAP Operational Brief',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    `Mode: ${mode}`,
    '',
    '## Operational Pulse',
    `- Fused incidents: ${summary.total || 0}`,
    `- Priority 1 incidents: ${summary.p1 || 0}`,
    `- Watchlisted incidents: ${summary.watchlisted || 0}`,
    `- New since baseline: ${summary.new || 0}`,
    `- Escalated since baseline: ${summary.escalated || 0}`,
    `- Resolved since baseline: ${summary.resolved || 0}`,
    `- Collection gaps: ${summary.collectionGaps || 0}`,
    '',
  ];

  if (delta?.baselineCapturedAt) {
    lines.push(`Baseline captured: ${formatTimestamp(delta.baselineCapturedAt)}`);
    lines.push('');
  }

  const items = briefItems.length ? briefItems : [];

  lines.push('## Priority Queue');
  if (!items.length) {
    lines.push('- No curated brief items yet. Use the Ops Workbench or Fusion Center to promote incidents.');
  } else {
    items.forEach((item, index) => {
      lines.push(`${index + 1}. [${item.priority}] ${item.title}`);
      lines.push(`   - Confidence: ${item.confidence} | Score: ${item.score} | ${formatCoords(item.lat, item.lon)}`);
      lines.push(`   - Sources: ${item.sources.join(', ') || '—'}`);
      lines.push(`   - Summary: ${item.summary || '—'}`);
      if (item.briefNote) {
        lines.push(`   - Analyst note: ${item.briefNote}`);
      }
    });
  }

  lines.push('');
  lines.push('## Delta Since Baseline');
  lines.push(`- New: ${delta?.new?.length || 0}`);
  lines.push(`- Escalated: ${delta?.escalated?.length || 0}`);
  lines.push(`- Resolved: ${delta?.resolved?.length || 0}`);

  const appendDeltaSection = (heading, itemsToRender) => {
    lines.push('');
    lines.push(`### ${heading}`);
    if (!itemsToRender.length) {
      lines.push('- None');
      return;
    }
    itemsToRender.slice(0, 6).forEach((item) => {
      lines.push(`- [${item.priority}] ${item.title} — ${item.sources.join(', ') || '—'} — ${formatCoords(item.lat, item.lon)}`);
    });
  };

  appendDeltaSection('New', delta?.new || []);
  appendDeltaSection('Escalated', delta?.escalated || []);
  appendDeltaSection('Resolved', delta?.resolved || []);

  return lines.join('\n');
}

function injectStyles() {
  if (document.getElementById('sigint-ops-workbench-styles')) return;
  const style = document.createElement('style');
  style.id = 'sigint-ops-workbench-styles';
  style.textContent = `
    .sigint-workbench-panel{position:fixed;top:52px;left:12px;width:min(450px,calc(100vw - 24px));max-height:calc(100vh - 76px);display:none;flex-direction:column;z-index:10006;background:rgba(7,11,18,0.92);border:1px solid rgba(255,255,255,0.08);border-radius:16px;box-shadow:0 28px 90px rgba(0,0,0,0.48);backdrop-filter:blur(14px);color:var(--color-text)}
    .sigint-workbench-panel[data-open="true"]{display:flex}
    [data-theme="light"] .sigint-workbench-panel{background:rgba(240,243,248,0.95);border-color:rgba(0,0,0,0.08);box-shadow:0 24px 80px rgba(15,23,42,0.14)}
    body[data-op-mode="briefing"] .sigint-workbench-panel{width:min(560px,calc(100vw - 24px))}
    body[data-op-mode="kiosk"] .sigint-workbench-panel{top:16px;left:16px;width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 32px)}
    .sigint-workbench-header,.sigint-workbench-tabs,.sigint-workbench-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px}
    .sigint-workbench-header{border-bottom:1px solid rgba(255,255,255,0.08)}
    [data-theme="light"] .sigint-workbench-header,[data-theme="light"] .sigint-workbench-tabs,[data-theme="light"] .sigint-workbench-footer{border-color:rgba(0,0,0,0.08)}
    .sigint-workbench-title{font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
    .sigint-workbench-meta{margin-top:4px;color:var(--color-text-muted);font-size:11px;line-height:1.45}
    .sigint-workbench-actions,.sigint-workbench-tabs{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .sigint-workbench-btn,.sigint-workbench-tab,.sigint-workbench-card__btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--color-text);font:inherit;cursor:pointer;transition:transform 120ms ease,background 120ms ease,border-color 120ms ease}
    .sigint-workbench-btn:hover,.sigint-workbench-tab:hover,.sigint-workbench-card__btn:hover,.sigint-workbench-btn:focus-visible,.sigint-workbench-tab:focus-visible,.sigint-workbench-card__btn:focus-visible{transform:translateY(-1px);background:rgba(0,212,255,0.12);border-color:rgba(0,212,255,0.24)}
    .sigint-workbench-tab[data-active="true"],.sigint-workbench-card__btn[data-active="true"]{background:rgba(0,212,255,0.16);border-color:rgba(0,212,255,0.28)}
    .sigint-workbench-tabs{border-bottom:1px solid rgba(255,255,255,0.08);padding-top:10px;padding-bottom:10px}
    .sigint-workbench-pulse{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.08)}
    .sigint-workbench-pill{padding:10px 10px 9px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)}
    [data-theme="light"] .sigint-workbench-pill{background:rgba(255,255,255,0.72);border-color:rgba(0,0,0,0.06)}
    .sigint-workbench-pill__value{font-size:16px;font-weight:700;line-height:1.1}
    .sigint-workbench-pill__label{margin-top:4px;color:var(--color-text-muted);font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
    .sigint-workbench-body{display:flex;flex-direction:column;gap:10px;padding:12px 14px;overflow:auto}
    .sigint-workbench-section-title{font-size:11px;font-family:var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-muted)}
    .sigint-workbench-section-meta{margin-top:4px;color:var(--color-text-faint);font-size:11px;line-height:1.5}
    .sigint-workbench-grid{display:grid;gap:10px}
    .sigint-workbench-card{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)}
    [data-theme="light"] .sigint-workbench-card{border-color:rgba(0,0,0,0.08);background:rgba(255,255,255,0.7)}
    .sigint-workbench-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .sigint-workbench-card__title{font-size:13px;font-weight:600;line-height:1.45}
    .sigint-workbench-card__meta{margin-top:4px;color:var(--color-text-muted);font-family:var(--font-mono);font-size:10px;line-height:1.45;letter-spacing:.08em;text-transform:uppercase}
    .sigint-workbench-card__summary{font-size:12px;line-height:1.55;color:var(--color-text)}
    .sigint-workbench-badges,.sigint-workbench-card__actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .sigint-workbench-badge{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,0.06);font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
    .sigint-workbench-badge[data-priority="P1"]{background:rgba(239,68,68,0.14);color:#fca5a5}
    .sigint-workbench-badge[data-priority="P2"]{background:rgba(245,158,11,0.14);color:#fdba74}
    .sigint-workbench-badge[data-priority="P3"]{background:rgba(34,197,94,0.14);color:#86efac}
    .sigint-workbench-empty{padding:16px;border-radius:14px;border:1px dashed rgba(255,255,255,0.12);color:var(--color-text-muted);font-size:12px;line-height:1.6}
    .sigint-workbench-stack{display:flex;flex-direction:column;gap:8px}
    .sigint-workbench-note{padding:9px 10px;border-radius:12px;background:rgba(0,0,0,0.16);color:var(--color-text-muted);font-size:11px;line-height:1.55}
    .sigint-workbench-delta-group{display:flex;flex-direction:column;gap:8px}
    .sigint-workbench-delta-group + .sigint-workbench-delta-group{margin-top:2px}
    .sigint-workbench-inline{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .sigint-workbench-footer{border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;padding-bottom:12px}
    .sigint-workbench-footer__meta{color:var(--color-text-muted);font-size:11px;line-height:1.45}
    @media (max-width:980px){.sigint-workbench-pulse{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media (max-width:720px){.sigint-workbench-panel{left:12px;right:12px;width:auto}.sigint-workbench-actions{justify-content:flex-start}.sigint-workbench-pulse{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function renderIncidentCard(incident, options = {}) {
  const {
    briefed = false,
    note = '',
    actions = [],
    deltaLabel = '',
  } = options;

  return `
    <article class="sigint-workbench-card" data-incident-id="${escapeHtml(incident.id)}">
      <div class="sigint-workbench-card__head">
        <div>
          <div class="sigint-workbench-card__title">${escapeHtml(incident.title)}</div>
          <div class="sigint-workbench-card__meta">${escapeHtml(formatCoords(incident.lat, incident.lon))} · ${escapeHtml((incident.sources || []).join(' + ') || '—')}</div>
        </div>
        ${deltaLabel ? `<span class="sigint-workbench-badge">${escapeHtml(deltaLabel)}</span>` : ''}
      </div>
      <div class="sigint-workbench-badges">
        <span class="sigint-workbench-badge" data-priority="${escapeHtml(incident.priority)}">${escapeHtml(incident.priority)}</span>
        <span class="sigint-workbench-badge">Confidence ${escapeHtml(incident.confidence)}</span>
        <span class="sigint-workbench-badge">Fresh ${escapeHtml(incident.freshnessLabel || formatAge(incident.freshestTimestamp))}</span>
        ${briefed ? '<span class="sigint-workbench-badge">Briefed</span>' : ''}
      </div>
      <div class="sigint-workbench-card__summary">${escapeHtml(incident.summary || 'No corroborated summary available.')}</div>
      ${note ? `<div class="sigint-workbench-note">${escapeHtml(note)}</div>` : ''}
      <div class="sigint-workbench-card__actions">
        ${actions.map((action) => `<button type="button" class="sigint-workbench-card__btn" data-action="${escapeHtml(action.id)}" ${action.active ? 'data-active="true"' : ''}>${escapeHtml(action.label)}</button>`).join('')}
      </div>
    </article>
  `;
}

export function createOpsWorkbench(bucket, context) {
  injectStyles();

  const panel = document.createElement('section');
  panel.className = 'sigint-workbench-panel';
  panel.dataset.open = 'false';
  panel.setAttribute('aria-label', 'Operational workbench');
  panel.innerHTML = `
    <div class="sigint-workbench-header">
      <div>
        <div class="sigint-workbench-title">Ops Workbench</div>
        <div class="sigint-workbench-meta">Curate the fused picture, compare against a baseline, and export a briefing-ready queue.</div>
      </div>
      <div class="sigint-workbench-actions">
        <button type="button" class="sigint-workbench-btn" data-role="baseline">Baseline</button>
        <button type="button" class="sigint-workbench-btn" data-role="copy">Copy brief</button>
        <button type="button" class="sigint-workbench-btn" data-role="close">Close</button>
      </div>
    </div>
    <div class="sigint-workbench-tabs">
      <button type="button" class="sigint-workbench-tab" data-tab="queue">Queue</button>
      <button type="button" class="sigint-workbench-tab" data-tab="brief">Brief</button>
      <button type="button" class="sigint-workbench-tab" data-tab="delta">Delta</button>
    </div>
    <div class="sigint-workbench-pulse"></div>
    <div class="sigint-workbench-body"></div>
    <div class="sigint-workbench-footer">
      <div class="sigint-workbench-footer__meta"></div>
      <div class="sigint-workbench-inline">
        <button type="button" class="sigint-workbench-btn" data-role="clear-brief">Clear brief</button>
        <button type="button" class="sigint-workbench-btn" data-role="clear-baseline">Clear baseline</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  bucket.push(() => panel.remove());

  const body = panel.querySelector('.sigint-workbench-body');
  const pulse = panel.querySelector('.sigint-workbench-pulse');
  const footerMeta = panel.querySelector('.sigint-workbench-footer__meta');
  const tabs = Array.from(panel.querySelectorAll('.sigint-workbench-tab'));
  const baselineBtn = panel.querySelector('[data-role="baseline"]');
  const copyBtn = panel.querySelector('[data-role="copy"]');
  const closeBtn = panel.querySelector('[data-role="close"]');
  const clearBriefBtn = panel.querySelector('[data-role="clear-brief"]');
  const clearBaselineBtn = panel.querySelector('[data-role="clear-baseline"]');

  let open = false;
  let activeTab = readStoredString(ACTIVE_TAB_STORAGE_KEY, 'queue');
  if (!['queue', 'brief', 'delta'].includes(activeTab)) activeTab = 'queue';

  let incidents = [];
  let briefItems = readStoredJson(BRIEF_STORAGE_KEY, []);
  if (!Array.isArray(briefItems)) briefItems = [];
  let baseline = readStoredJson(BASELINE_STORAGE_KEY, null);
  let delta = computeDelta(incidents, baseline);
  let collectionGaps = [];
  let summary = {
    total: 0,
    p1: 0,
    briefed: briefItems.length,
    new: 0,
    escalated: 0,
    resolved: 0,
    collectionGaps: 0,
    watchlisted: 0,
  };
  let lastAlertKey = '';

  const persistBriefItems = () => {
    writeStoredJson(BRIEF_STORAGE_KEY, briefItems);
  };

  const persistBaseline = () => {
    if (baseline) writeStoredJson(BASELINE_STORAGE_KEY, baseline);
    else {
      try {
        window.localStorage.removeItem(BASELINE_STORAGE_KEY);
      } catch {
        // ignore storage failures
      }
    }
  };

  const isBriefed = (incidentId) => briefItems.some((item) => item.id === incidentId);

  let lastEmitSignature = '';

  const emitUpdate = () => {
    const detail = {
      summary,
      briefedIds: briefItems.map((item) => item.id),
    };
    const nextSignature = stableSerialize(detail);
    if (nextSignature === lastEmitSignature) return;
    lastEmitSignature = nextSignature;
    dispatchSigintEvent('sigint:ops-workbench-update', detail);
  };

  const updateSummary = () => {
    const fusionSummary = getFusionApi().getSummary?.() || { watchlisted: 0 };
    summary = {
      total: incidents.length,
      p1: incidents.filter((incident) => incident.priority === 'P1').length,
      briefed: briefItems.length,
      new: delta.new.length,
      escalated: delta.escalated.length,
      resolved: delta.resolved.length,
      collectionGaps: collectionGaps.length,
      watchlisted: fusionSummary.watchlisted || 0,
    };
    context.onSummaryChange?.(summary);
  };

  const syncBriefItemsAgainstLiveIncidents = () => {
    const incidentMap = new Map(incidents.map((incident) => [incident.id, incident]));
    const nextBriefItems = briefItems.map((item) => {
      const live = incidentMap.get(item.id);
      return live ? snapshotIncident(live, item) : item;
    });
    const changed = stableSerialize(nextBriefItems) !== stableSerialize(briefItems);
    if (!changed) return false;
    briefItems = nextBriefItems;
    persistBriefItems();
    return true;
  };

  const renderPulse = () => {
    if (!pulse || !open) return;
    const pulseItems = [
      { label: 'P1 queue', value: summary.p1 },
      { label: 'Brief items', value: summary.briefed },
      { label: 'Delta alerts', value: summary.new + summary.escalated },
      { label: 'Collection gaps', value: summary.collectionGaps },
    ];
    setInnerHtmlIfChanged(pulse, pulseItems.map((item) => `
      <div class="sigint-workbench-pill">
        <div class="sigint-workbench-pill__value">${escapeHtml(item.value)}</div>
        <div class="sigint-workbench-pill__label">${escapeHtml(item.label)}</div>
      </div>
    `).join(''), pulseItems);
  };

  const focusIncident = (incident) => {
    const api = getPublicApi();
    api.focusLocation?.(incident.lat, incident.lon, {
      title: incident.title,
      detail: `${incident.summary || ''}\n\nSources: ${(incident.sources || []).join(', ')}`.trim(),
      domain: 'ops-workbench',
      status: `${incident.priority} / Confidence ${incident.confidence}`,
      source: (incident.sources || []).join(', '),
      url: incident.primaryUrl || '',
      lat: incident.lat,
      lon: incident.lon,
    });
  };

  const addBriefItem = (incident) => {
    if (!incident?.id) return;
    const existing = briefItems.find((item) => item.id === incident.id);
    if (existing) {
      briefItems = briefItems.map((item) => item.id === incident.id ? snapshotIncident(incident, item) : item);
      persistBriefItems();
      updateSummary();
      render();
      emitUpdate();
      context.showToast?.(`Updated ${incident.title} in the brief.`, 'success');
      return;
    }
    briefItems = [snapshotIncident(incident), ...briefItems].slice(0, 12);
    persistBriefItems();
    updateSummary();
    render();
    emitUpdate();
    context.showToast?.(`Promoted ${incident.title} to the brief.`, 'success');
  };

  const removeBriefItem = (incidentId) => {
    const removed = briefItems.find((item) => item.id === incidentId);
    briefItems = briefItems.filter((item) => item.id !== incidentId);
    persistBriefItems();
    updateSummary();
    render();
    emitUpdate();
    if (removed) {
      context.showToast?.(`Removed ${removed.title} from the brief.`, 'warning');
    }
  };

  const moveBriefItem = (incidentId, direction) => {
    const index = briefItems.findIndex((item) => item.id === incidentId);
    if (index === -1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= briefItems.length) return;
    const nextBrief = [...briefItems];
    const [item] = nextBrief.splice(index, 1);
    nextBrief.splice(nextIndex, 0, item);
    briefItems = nextBrief;
    persistBriefItems();
    render();
    emitUpdate();
  };

  const annotateBriefItem = async (incidentId) => {
    const item = briefItems.find((entry) => entry.id === incidentId);
    if (!item) return;
    const note = await requestGlassPrompt(bucket, {
      eyebrow: 'Briefing annotation',
      title: 'Add analyst context',
      message: `Capture the why, next action, or confidence note for “${item.title}”.`,
      defaultValue: item.briefNote || '',
      placeholder: 'Add note, assessment, or next step…',
      confirmLabel: 'Save note',
      cancelLabel: 'Cancel',
      multiline: true,
      allowEmpty: true,
      maxLength: 480,
    });
    if (note == null) return;
    const nextNote = note.trim();
    briefItems = briefItems.map((entry) => entry.id === incidentId ? { ...entry, briefNote: nextNote } : entry);
    persistBriefItems();
    render();
    emitUpdate();
    context.showToast?.(nextNote ? 'Analyst note updated.' : 'Analyst note cleared.', nextNote ? 'success' : 'warning');
  };

  const clearBrief = () => {
    briefItems = [];
    persistBriefItems();
    updateSummary();
    render();
    emitUpdate();
    context.showToast?.('Brief queue cleared.', 'warning');
  };

  const captureBaseline = () => {
    baseline = {
      capturedAt: Date.now(),
      incidents: incidents.map((incident) => snapshotIncident(incident)),
    };
    persistBaseline();
    delta = computeDelta(incidents, baseline);
    updateSummary();
    render();
    emitUpdate();
    context.showToast?.(`Baseline captured with ${baseline.incidents.length} incidents.`, 'success');
  };

  const clearBaseline = () => {
    baseline = null;
    persistBaseline();
    delta = computeDelta(incidents, baseline);
    updateSummary();
    render();
    emitUpdate();
    context.showToast?.('Delta baseline cleared.', 'warning');
  };

  const setTab = (tab) => {
    activeTab = ['queue', 'brief', 'delta'].includes(tab) ? tab : 'queue';
    writeStoredString(ACTIVE_TAB_STORAGE_KEY, activeTab);
    render();
  };

  const renderQueueTab = () => {
    const sortedIncidents = [...incidents].sort(sortIncidentLike);
    const spotlight = sortedIncidents.slice(0, 8);
    if (!spotlight.length) {
      return `<div class="sigint-workbench-empty">No fused incidents are available yet. Leave the dashboard running until the feeds overlap enough to build a queue.</div>`;
    }
    return `
      <div class="sigint-workbench-grid">
        <div>
          <div class="sigint-workbench-section-title">Priority Queue</div>
          <div class="sigint-workbench-section-meta">This view elevates the corroborated incidents most likely to matter right now.</div>
        </div>
        <div class="sigint-workbench-stack">
          ${spotlight.map((incident) => renderIncidentCard(incident, {
            briefed: isBriefed(incident.id),
            actions: [
              { id: 'focus', label: 'Focus' },
              { id: 'filter', label: 'Filter' },
              { id: 'brief', label: isBriefed(incident.id) ? 'Briefed' : 'Brief', active: isBriefed(incident.id) },
            ],
          })).join('')}
        </div>
      </div>
    `;
  };

  const renderBriefTab = () => {
    if (!briefItems.length) {
      return `<div class="sigint-workbench-empty">The briefing board is empty. Promote incidents from the queue or the Fusion Center to assemble a tight handoff for executives or operators.</div>`;
    }
    return `
      <div class="sigint-workbench-grid">
        <div>
          <div class="sigint-workbench-section-title">Curated Brief</div>
          <div class="sigint-workbench-section-meta">Pinned items stay here even as the live queue changes, which makes it easier to stabilize a narrative before sharing it out.</div>
        </div>
        <div class="sigint-workbench-stack">
          ${briefItems.map((incident, index) => renderIncidentCard(incident, {
            note: incident.briefNote,
            actions: [
              { id: 'focus', label: 'Focus' },
              { id: 'note', label: 'Note' },
              { id: 'move-up', label: index === 0 ? 'Top' : 'Up', active: index === 0 },
              { id: 'move-down', label: index === briefItems.length - 1 ? 'Bottom' : 'Down', active: index === briefItems.length - 1 },
              { id: 'remove', label: 'Remove' },
            ],
          })).join('')}
        </div>
      </div>
    `;
  };

  const renderDeltaGroup = (label, itemsToRender, emptyCopy) => `
    <div class="sigint-workbench-delta-group">
      <div>
        <div class="sigint-workbench-section-title">${escapeHtml(label)} (${escapeHtml(itemsToRender.length)})</div>
        <div class="sigint-workbench-section-meta">${escapeHtml(emptyCopy)}</div>
      </div>
      ${itemsToRender.length ? `<div class="sigint-workbench-stack">${itemsToRender.map((incident) => renderIncidentCard(incident, {
        briefed: isBriefed(incident.id),
        deltaLabel: label,
        actions: [
          { id: 'focus', label: 'Focus' },
          { id: 'brief', label: isBriefed(incident.id) ? 'Briefed' : 'Brief', active: isBriefed(incident.id) },
        ],
      })).join('')}</div>` : `<div class="sigint-workbench-empty">${escapeHtml(emptyCopy)}</div>`}
    </div>
  `;

  const renderDeltaTab = () => {
    if (!baseline?.capturedAt) {
      return `<div class="sigint-workbench-empty">No baseline has been captured yet. Use the Baseline button to freeze the current incident picture, then return later to see what is new, escalated, or resolved.</div>`;
    }

    return `
      <div class="sigint-workbench-grid">
        <div>
          <div class="sigint-workbench-section-title">Delta Monitor</div>
          <div class="sigint-workbench-section-meta">Baseline from ${escapeHtml(formatTimestamp(delta.baselineCapturedAt))} · ${escapeHtml(formatAge(delta.baselineCapturedAt))} ago.</div>
        </div>
        ${renderDeltaGroup('New', delta.new, 'No new incidents since the baseline was captured.')}
        ${renderDeltaGroup('Escalated', delta.escalated, 'No existing incidents have materially escalated since baseline.')}
        ${renderDeltaGroup('Resolved', delta.resolved, 'No baseline incidents have resolved out of the picture yet.')}
      </div>
    `;
  };

  const renderFooter = () => {
    if (!footerMeta || !open) return;
    setTextContentIfChanged(
      footerMeta,
      baseline?.capturedAt
        ? `Baseline: ${formatTimestamp(baseline.capturedAt)} · Queue ${summary.total} · Delta ${summary.new + summary.escalated}`
        : `No baseline captured · Queue ${summary.total} · Brief ${summary.briefed}`,
    );
  };

  const render = () => {
    if (!open) return;

    tabs.forEach((tabButton) => {
      tabButton.dataset.active = tabButton.dataset.tab === activeTab ? 'true' : 'false';
    });

    renderPulse();
    renderFooter();

    if (!body) return;

    let nextHtml = renderQueueTab();
    if (activeTab === 'brief') {
      nextHtml = renderBriefTab();
    } else if (activeTab === 'delta') {
      nextHtml = renderDeltaTab();
    }

    setInnerHtmlIfChanged(body, nextHtml, {
      activeTab,
      summary,
      briefItems,
      delta,
      incidents: incidents.map((incident) => ({
        id: incident.id,
        priority: incident.priority,
        score: incident.score,
        confidence: incident.confidence,
      })),
      collectionGaps: collectionGaps.map((entry) => ({ key: entry.key, status: entry.status, error: entry.error, ageMinutes: entry.ageMinutes })),
    });
  };

  const copyBriefingMarkdown = async () => {
    const mode = document.body.dataset.opMode || 'analyst';
    const text = buildMarkdownBrief(summary, briefItems, delta, mode);
    try {
      await copyText(text);
      context.showToast?.('Markdown operational brief copied.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Ops workbench copy failed:', error);
      context.showToast?.('Unable to copy the operational brief.', 'danger');
    }
  };

  const sync = (options = {}) => {
    const { silent = false } = options;
    const liveIncidents = getFusionApi().getIncidents?.() || [];
    incidents = Array.isArray(liveIncidents) ? liveIncidents.map((incident) => snapshotIncident(incident)) : [];
    collectionGaps = detectCollectionGaps(getSourceHealth());
    syncBriefItemsAgainstLiveIncidents();
    delta = computeDelta(incidents, baseline);
    updateSummary();
    render();
    emitUpdate();

    const alertKey = `${summary.p1}:${summary.new}:${summary.escalated}:${summary.collectionGaps}`;
    if (!silent && alertKey !== lastAlertKey) {
      if (summary.new > 0 || summary.escalated > 0) {
        context.showToast?.(`${summary.new} new and ${summary.escalated} escalated incidents since baseline.`, 'warning');
      } else if (summary.collectionGaps > 0) {
        context.showToast?.(`${summary.collectionGaps} collection gaps need attention.`, 'warning');
      }
    }
    lastAlertKey = alertKey;
  };

  const openPanel = () => {
    open = true;
    panel.dataset.open = 'true';
    writeStoredFlag(PANEL_OPEN_STORAGE_KEY, true);
    sync({ silent: true });
  };

  const closePanel = () => {
    open = false;
    panel.dataset.open = 'false';
    writeStoredFlag(PANEL_OPEN_STORAGE_KEY, false);
  };

  const togglePanel = () => {
    if (open) closePanel();
    else openPanel();
  };

  const findIncident = (target) => {
    const card = target.closest('[data-incident-id]');
    if (!card) return null;
    const incidentId = card.dataset.incidentId;
    return incidents.find((item) => item.id === incidentId)
      || briefItems.find((item) => item.id === incidentId)
      || delta.new.find((item) => item.id === incidentId)
      || delta.escalated.find((item) => item.id === incidentId)
      || delta.resolved.find((item) => item.id === incidentId)
      || null;
  };

  const onBodyClick = (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const incident = findIncident(event.target);
    if (!incident) return;

    if (action === 'focus') {
      focusIncident(incident);
      return;
    }
    if (action === 'filter') {
      const nextFilter = incident.domains?.includes('maritime') ? 'naval' : (incident.domains?.[0] || 'all');
      context.setFilter?.(nextFilter);
      return;
    }
    if (action === 'brief') {
      addBriefItem(incident);
      return;
    }
    if (action === 'remove') {
      removeBriefItem(incident.id);
      return;
    }
    if (action === 'move-up') {
      moveBriefItem(incident.id, 'up');
      return;
    }
    if (action === 'move-down') {
      moveBriefItem(incident.id, 'down');
      return;
    }
    if (action === 'note') {
      void annotateBriefItem(incident.id);
    }
  };

  const onFusionUpdate = () => sync({ silent: true });
  const onSourceHealth = () => {
    if (document.visibilityState === 'hidden') return;
    sync({ silent: true });
  };

  body?.addEventListener('click', onBodyClick);
  baselineBtn?.addEventListener('click', captureBaseline);
  copyBtn?.addEventListener('click', copyBriefingMarkdown);
  closeBtn?.addEventListener('click', closePanel);
  clearBriefBtn?.addEventListener('click', clearBrief);
  clearBaselineBtn?.addEventListener('click', clearBaseline);
  const tabListeners = new Map();
  tabs.forEach((tabButton) => {
    const onTabClick = () => setTab(tabButton.dataset.tab || 'queue');
    tabListeners.set(tabButton, onTabClick);
    tabButton.addEventListener('click', onTabClick);
  });
  window.addEventListener('sigint:fusion-updated', onFusionUpdate);
  window.addEventListener('sigint:source-health', onSourceHealth);

  bucket.push(() => body?.removeEventListener('click', onBodyClick));
  bucket.push(() => baselineBtn?.removeEventListener('click', captureBaseline));
  bucket.push(() => copyBtn?.removeEventListener('click', copyBriefingMarkdown));
  bucket.push(() => closeBtn?.removeEventListener('click', closePanel));
  bucket.push(() => clearBriefBtn?.removeEventListener('click', clearBrief));
  bucket.push(() => clearBaselineBtn?.removeEventListener('click', clearBaseline));
  tabs.forEach((tabButton) => bucket.push(() => tabButton.removeEventListener('click', tabListeners.get(tabButton))));
  bucket.push(() => window.removeEventListener('sigint:fusion-updated', onFusionUpdate));
  bucket.push(() => window.removeEventListener('sigint:source-health', onSourceHealth));

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    sync({ silent: true });
  }, 20000);
  bucket.push(() => window.clearInterval(intervalId));

  sync({ silent: true });
  if (readStoredFlag(PANEL_OPEN_STORAGE_KEY, false)) {
    openPanel();
  }

  window.__SIGINT_MAP_OPS_WORKBENCH__ = {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    isOpen: () => open,
    getSummary: () => summary,
    getBriefItems: () => briefItems,
    addBriefItem,
    isBriefed,
    captureBaseline,
    clearBaseline,
    clearBrief,
    copyBriefingMarkdown,
    sync: () => sync({ silent: true }),
  };
  bucket.push(() => {
    delete window.__SIGINT_MAP_OPS_WORKBENCH__;
  });

  return {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    isOpen: () => open,
    getSummary: () => summary,
    getBriefItems: () => briefItems,
    addBriefItem,
    isBriefed,
    captureBaseline,
    clearBaseline,
    clearBrief,
    copyBriefingMarkdown,
    sync: () => sync({ silent: true }),
  };
}
