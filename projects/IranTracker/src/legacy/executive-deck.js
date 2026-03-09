import {
  clamp,
  copyText,
  dispatchSigintEvent,
  escapeHtml,
  formatCoords,
  getSigintPublicApi as getPublicApi,
  getSigintSourceHealth,
  readStoredFlag,
  readStoredJson,
  setInnerHtmlIfChanged,
  stableSerialize,
  writeStoredFlag,
  writeStoredJson,
} from './shared-utils.js';

const PANEL_OPEN_STORAGE_KEY = 'sigint-map:executive-deck:open:v1';
const TOUR_ACTIVE_STORAGE_KEY = 'sigint-map:executive-tour:active:v1';
const MAX_ACTIVITY_ITEMS = 8;

function dedupeIncidents(incidents) {
  const seen = new Set();
  const deduped = [];
  incidents.forEach((incident) => {
    if (!incident?.id || seen.has(incident.id)) return;
    seen.add(incident.id);
    deduped.push(incident);
  });
  return deduped;
}

function toneForScore(score) {
  if (score >= 78) return 'critical';
  if (score >= 58) return 'elevated';
  if (score >= 34) return 'active';
  return 'steady';
}

function labelForTone(tone) {
  switch (tone) {
    case 'critical':
      return 'Surging';
    case 'elevated':
      return 'Elevated';
    case 'active':
      return 'Active';
    default:
      return 'Steady';
  }
}

function describePulse(tone, incidents, degradedSources, workbenchSummary) {
  const lead = incidents[0];
  const newCount = Number(workbenchSummary?.new || 0);
  const escalated = Number(workbenchSummary?.escalated || 0);
  const degraded = degradedSources.length;

  if (lead) {
    const deltaText = newCount || escalated
      ? `${newCount} new / ${escalated} escalated`
      : 'stable delta';
    const degradedText = degraded ? `${degraded} degraded source${degraded === 1 ? '' : 's'}` : 'feeds healthy';
    if (tone === 'critical') {
      return `${lead.priority} ${lead.title} is driving the picture; ${deltaText} and ${degradedText}.`;
    }
    if (tone === 'elevated') {
      return `${lead.title} is the lead signal; ${deltaText} with ${degradedText}.`;
    }
    if (tone === 'active') {
      return `${lead.title} anchors the current view; ${deltaText}.`;
    }
  }

  if (degraded > 0) {
    return `Live collection is quiet, but ${degraded} source${degraded === 1 ? '' : 's'} need attention.`;
  }

  return 'The live picture is stable; the deck is tracking for corroborated changes.';
}

function buildPulse(incidents, watchSummary = {}, workbenchSummary = {}, sourceHealthEntries = []) {
  const topScore = incidents.slice(0, 3).reduce((sum, incident) => sum + Math.min(18, Math.round(Number(incident.score) || 0)), 0);
  const p1Count = incidents.filter((incident) => incident.priority === 'P1').length;
  const p2Count = incidents.filter((incident) => incident.priority === 'P2').length;
  const hotZones = Number(watchSummary.hot || 0);
  const newHits = Number(watchSummary.newHits || 0);
  const deltaNew = Number(workbenchSummary.new || 0);
  const deltaEscalated = Number(workbenchSummary.escalated || 0);
  const collectionGaps = Number(workbenchSummary.collectionGaps || 0);
  const degradedSources = sourceHealthEntries.filter((entry) => entry?.status === 'error' || entry?.pending > 0);
  const staleSources = sourceHealthEntries.filter((entry) => {
    if (!entry?.lastFetchedAt || entry.status === 'error') return false;
    return Date.now() - entry.lastFetchedAt > 30 * 60 * 1000;
  });

  const score = clamp(
    Math.round(
      Math.min(40, topScore)
      + p1Count * 12
      + p2Count * 4
      + hotZones * 6
      + Math.min(newHits, 6) * 3
      + Math.min(deltaNew, 4) * 4
      + Math.min(deltaEscalated, 4) * 5
      - Math.min(collectionGaps, 4) * 2
      - Math.min(degradedSources.length, 4) * 4
      - Math.min(staleSources.length, 4) * 2,
    ),
    6,
    99,
  );

  const tone = toneForScore(score);
  const toneLabel = labelForTone(tone);
  const leadIncident = incidents[0] || null;

  return {
    score,
    tone,
    toneLabel,
    leadIncident,
    critical: p1Count,
    hotZones,
    newHits,
    deltaNew,
    deltaEscalated,
    collectionGaps,
    degradedSources,
    staleSources,
    description: describePulse(tone, incidents, degradedSources, workbenchSummary),
  };
}

function injectStyles() {
  if (document.getElementById('sigint-executive-deck-styles')) return;

  const style = document.createElement('style');
  style.id = 'sigint-executive-deck-styles';
  style.textContent = `
    .sigint-exec-launcher,
    .sigint-exec-btn {
      border:none;
      outline:none;
      font:inherit;
      cursor:pointer;
    }
    .sigint-exec-launcher {
      position:absolute;
      top:78px;
      left:16px;
      z-index:22;
      display:inline-flex;
      align-items:center;
      gap:10px;
      min-height:38px;
      padding:0 14px;
      border-radius:999px;
      background:rgba(7,11,18,0.86);
      border:1px solid rgba(255,255,255,0.08);
      box-shadow:0 18px 40px rgba(0,0,0,0.34);
      backdrop-filter:blur(14px);
      color:var(--color-text);
      font-family:var(--font-mono);
      font-size:11px;
      letter-spacing:.08em;
      text-transform:uppercase;
      transition:opacity 140ms ease, transform 140ms ease;
    }
    .sigint-exec-launcher[data-hidden="true"] {
      opacity:0;
      pointer-events:none;
      transform:translateY(-6px);
    }
    .sigint-exec-launcher__score {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:28px;
      height:28px;
      border-radius:999px;
      background:linear-gradient(135deg, rgba(0,212,255,0.16), rgba(99,102,241,0.18));
      color:#dff8ff;
      box-shadow:0 0 0 1px rgba(0,212,255,0.16), 0 0 20px rgba(0,212,255,0.12);
      font-weight:700;
    }
    .sigint-exec-launcher__tone { color:var(--color-text-muted); }
    .sigint-exec-deck {
      position:absolute;
      top:78px;
      left:16px;
      z-index:22;
      width:min(430px, calc(100vw - 32px));
      max-height:min(74vh, 760px);
      display:flex;
      flex-direction:column;
      border-radius:18px;
      border:1px solid rgba(255,255,255,0.08);
      background:rgba(7,11,18,0.88);
      box-shadow:0 30px 80px rgba(0,0,0,0.44);
      backdrop-filter:blur(18px);
      color:var(--color-text);
      overflow:hidden;
      transform:translateY(-8px);
      opacity:0;
      pointer-events:none;
      transition:opacity 160ms ease, transform 160ms ease;
    }
    .sigint-exec-deck[data-open="true"] {
      opacity:1;
      transform:translateY(0);
      pointer-events:auto;
    }
    [data-theme="light"] .sigint-exec-launcher,
    [data-theme="light"] .sigint-exec-deck {
      background:rgba(244,247,252,0.94);
      border-color:rgba(0,0,0,0.08);
      box-shadow:0 24px 72px rgba(15,23,42,0.14);
    }
    .sigint-exec-head {
      position:relative;
      padding:16px 16px 14px;
      border-bottom:1px solid rgba(255,255,255,0.06);
      background:
        radial-gradient(circle at top right, rgba(0,212,255,0.22), transparent 44%),
        radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,0.03), transparent 72%);
    }
    [data-theme="light"] .sigint-exec-head { border-bottom-color:rgba(0,0,0,0.08); }
    .sigint-exec-eyebrow { font-family:var(--font-mono); font-size:10px; color:var(--color-text-faint); text-transform:uppercase; letter-spacing:.14em; }
    .sigint-exec-title-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-top:10px; }
    .sigint-exec-title { font-family:var(--font-display); font-size:24px; line-height:1.05; letter-spacing:-0.02em; }
    .sigint-exec-title__score { display:block; font-size:34px; margin-top:4px; font-variant-numeric:tabular-nums; }
    .sigint-exec-pill { display:inline-flex; align-items:center; min-height:24px; padding:0 10px; border-radius:999px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.08); font-family:var(--font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--color-text); }
    .sigint-exec-pill[data-tone="critical"] { background:rgba(239,68,68,0.14); color:#fecaca; border-color:rgba(239,68,68,0.22); }
    .sigint-exec-pill[data-tone="elevated"] { background:rgba(245,158,11,0.14); color:#fed7aa; border-color:rgba(245,158,11,0.22); }
    .sigint-exec-pill[data-tone="active"] { background:rgba(14,165,233,0.14); color:#bae6fd; border-color:rgba(14,165,233,0.22); }
    .sigint-exec-pill[data-tone="steady"] { background:rgba(34,197,94,0.14); color:#bbf7d0; border-color:rgba(34,197,94,0.22); }
    .sigint-exec-description { margin-top:10px; color:var(--color-text-muted); font-size:12px; line-height:1.6; max-width:96%; }
    .sigint-exec-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:14px; }
    .sigint-exec-btn { display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:0 11px; border-radius:999px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:var(--color-text); font-family:var(--font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; transition:transform 120ms ease, background 120ms ease, border-color 120ms ease; }
    .sigint-exec-btn:hover,.sigint-exec-btn:focus-visible { background:rgba(0,212,255,0.12); border-color:rgba(0,212,255,0.22); transform:translateY(-1px); }
    .sigint-exec-btn[data-active="true"] { background:rgba(0,212,255,0.16); border-color:rgba(0,212,255,0.24); box-shadow:0 0 0 1px rgba(0,212,255,0.12), 0 0 16px rgba(0,212,255,0.12); }
    .sigint-exec-body { overflow:auto; display:flex; flex-direction:column; gap:14px; padding:14px 16px 16px; }
    .sigint-exec-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; }
    .sigint-exec-stat { padding:10px 10px 11px; border-radius:14px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); }
    [data-theme="light"] .sigint-exec-stat { border-color:rgba(0,0,0,0.08); background:rgba(255,255,255,0.72); }
    .sigint-exec-stat__label { font-family:var(--font-mono); font-size:9px; color:var(--color-text-faint); text-transform:uppercase; letter-spacing:.12em; }
    .sigint-exec-stat__value { margin-top:8px; font-size:18px; font-weight:700; line-height:1; font-variant-numeric:tabular-nums; }
    .sigint-exec-stat__meta { margin-top:6px; font-family:var(--font-mono); font-size:10px; color:var(--color-text-muted); }
    .sigint-exec-section { display:flex; flex-direction:column; gap:10px; }
    .sigint-exec-section__head { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
    .sigint-exec-section__title { font-family:var(--font-display); font-size:15px; letter-spacing:.01em; }
    .sigint-exec-section__meta { font-family:var(--font-mono); font-size:10px; color:var(--color-text-faint); text-transform:uppercase; letter-spacing:.08em; }
    .sigint-exec-list { display:flex; flex-direction:column; gap:10px; }
    .sigint-exec-card { border:1px solid rgba(255,255,255,0.08); border-radius:15px; padding:12px; background:rgba(255,255,255,0.03); display:grid; gap:9px; }
    [data-theme="light"] .sigint-exec-card { border-color:rgba(0,0,0,0.08); background:rgba(255,255,255,0.7); }
    .sigint-exec-card__head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .sigint-exec-card__title { font-size:13px; font-weight:600; line-height:1.4; }
    .sigint-exec-card__meta,.sigint-exec-card__summary,.sigint-exec-activity__meta { color:var(--color-text-muted); font-size:11px; line-height:1.55; }
    .sigint-exec-card__meta { margin-top:4px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.08em; font-size:10px; }
    .sigint-exec-badges,.sigint-exec-card__actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .sigint-exec-badge { display:inline-flex; align-items:center; min-height:22px; padding:0 8px; border-radius:999px; background:rgba(255,255,255,0.06); font-family:var(--font-mono); font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
    .sigint-exec-badge[data-priority="P1"] { background:rgba(239,68,68,0.14); color:#fecaca; }
    .sigint-exec-badge[data-priority="P2"] { background:rgba(245,158,11,0.14); color:#fed7aa; }
    .sigint-exec-badge[data-priority="P3"] { background:rgba(34,197,94,0.14); color:#bbf7d0; }
    .sigint-exec-badge[data-tone="warning"] { background:rgba(245,158,11,0.14); color:#fed7aa; }
    .sigint-exec-badge[data-tone="steady"] { background:rgba(34,197,94,0.14); color:#bbf7d0; }
    .sigint-exec-empty { padding:14px; border-radius:14px; border:1px dashed rgba(255,255,255,0.12); color:var(--color-text-muted); font-size:12px; line-height:1.6; }
    .sigint-exec-activity { display:grid; gap:8px; }
    .sigint-exec-activity__item { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:flex-start; padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); }
    [data-theme="light"] .sigint-exec-activity__item { border-color:rgba(0,0,0,0.08); background:rgba(255,255,255,0.72); }
    .sigint-exec-activity__tone { width:10px; height:10px; margin-top:3px; border-radius:999px; background:rgba(255,255,255,0.2); box-shadow:0 0 0 4px rgba(255,255,255,0.03); }
    .sigint-exec-activity__tone[data-tone="success"] { background:#22c55e; box-shadow:0 0 0 4px rgba(34,197,94,0.1); }
    .sigint-exec-activity__tone[data-tone="warning"] { background:#f59e0b; box-shadow:0 0 0 4px rgba(245,158,11,0.1); }
    .sigint-exec-activity__tone[data-tone="danger"] { background:#ef4444; box-shadow:0 0 0 4px rgba(239,68,68,0.1); }
    .sigint-exec-activity__label { font-size:12px; line-height:1.5; }
    .sigint-exec-activity__time { font-family:var(--font-mono); font-size:10px; color:var(--color-text-faint); text-transform:uppercase; letter-spacing:.08em; white-space:nowrap; margin-top:1px; }
    .sigint-exec-spotlight { position:absolute; left:50%; bottom:calc(var(--space-6) + 86px); transform:translateX(-50%) translateY(8px); z-index:21; width:min(540px, calc(100vw - 32px)); padding:14px 16px; border-radius:18px; border:1px solid rgba(255,255,255,0.1); background:rgba(7,11,18,0.9); box-shadow:0 28px 80px rgba(0,0,0,0.42); backdrop-filter:blur(16px); color:var(--color-text); opacity:0; pointer-events:none; transition:opacity 160ms ease, transform 160ms ease; }
    .sigint-exec-spotlight[data-open="true"] { opacity:1; transform:translateX(-50%) translateY(0); pointer-events:auto; }
    [data-theme="light"] .sigint-exec-spotlight { background:rgba(244,247,252,0.95); border-color:rgba(0,0,0,0.08); box-shadow:0 24px 72px rgba(15,23,42,0.14); }
    .sigint-exec-spotlight__top,.sigint-exec-spotlight__actions { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; }
    .sigint-exec-spotlight__eyebrow,.sigint-exec-spotlight__meta { font-family:var(--font-mono); font-size:10px; color:var(--color-text-faint); text-transform:uppercase; letter-spacing:.12em; }
    .sigint-exec-spotlight__title { margin-top:8px; font-family:var(--font-display); font-size:20px; line-height:1.15; letter-spacing:-0.02em; }
    .sigint-exec-spotlight__summary { margin-top:10px; color:var(--color-text-muted); font-size:12px; line-height:1.6; }
    body[data-op-mode="kiosk"] .sigint-exec-deck, body[data-op-mode="kiosk"] .sigint-exec-launcher { top:16px; }
    @media (max-width: 1200px) { .sigint-exec-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 900px) {
      .sigint-exec-deck,.sigint-exec-launcher { left:12px; top:70px; }
      .sigint-exec-deck { width:calc(100vw - 24px); max-height:min(72vh, 680px); }
      .sigint-exec-spotlight { bottom:calc(var(--space-6) + 112px); width:calc(100vw - 24px); }
    }
    @media (max-width: 640px) {
      .sigint-exec-grid { grid-template-columns:1fr 1fr; }
      .sigint-exec-title { font-size:20px; }
      .sigint-exec-title__score { font-size:30px; }
      .sigint-exec-actions { gap:6px; }
      .sigint-exec-btn { min-height:28px; padding:0 10px; font-size:9px; }
      .sigint-exec-body { padding:12px; }
      .sigint-exec-spotlight { bottom:calc(var(--space-6) + 122px); }
    }
  `;

  document.head.appendChild(style);
}

function buildDeckDigest(pulse, incidents, snapshots, workbenchSummary, sourceHealthEntries, recentEvents) {
  const degraded = pulse.degradedSources.map((entry) => entry.label || entry.key).slice(0, 5);
  const lines = [
    `SIGINT-MAP Command Deck`,
    `Pulse: ${pulse.score} (${pulse.toneLabel})`,
    `P1 incidents: ${pulse.critical} | Hot zones: ${pulse.hotZones} | New hits: ${pulse.newHits}`,
    `Delta: ${Number(workbenchSummary?.new || 0)} new | ${Number(workbenchSummary?.escalated || 0)} escalated | ${Number(workbenchSummary?.resolved || 0)} resolved`,
    `Degraded feeds: ${degraded.length ? degraded.join(', ') : 'none'}`,
    '',
    'Top incidents:',
  ];

  if (!incidents.length) {
    lines.push('1. No corroborated incidents are currently active.');
  } else {
    incidents.slice(0, 5).forEach((incident, index) => {
      lines.push(`${index + 1}. ${incident.priority} | ${incident.title} | Confidence ${incident.confidence} | ${incident.sources.join(', ')} | ${formatCoords(incident.lat, incident.lon)}`);
    });
  }

  lines.push('', 'Watch zones:');
  if (!snapshots.length) {
    lines.push('1. No active watch zones configured.');
  } else {
    snapshots.slice(0, 4).forEach((snapshot, index) => {
      const topLabel = snapshot.topIncident ? `${snapshot.topIncident.priority} ${snapshot.topIncident.title}` : 'No active incident';
      lines.push(`${index + 1}. ${snapshot.zone.name} | ${snapshot.activeCount} active | ${snapshot.newHits.length} new | ${topLabel}`);
    });
  }

  lines.push('', 'Recent activity:');
  if (!recentEvents.length) {
    lines.push('No recent deck activity.');
  } else {
    recentEvents.slice(0, 5).forEach((entry, index) => {
      lines.push(`${index + 1}. ${entry.label}${entry.meta ? ` — ${entry.meta}` : ''}`);
    });
  }

  lines.push('', `Feeds tracked: ${sourceHealthEntries.length}`);
  return lines.join('\n');
}

export function createExecutiveDeck(bucket, context) {
  injectStyles();

  const host = document.getElementById('main-area') || document.body;
  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'sigint-exec-launcher';
  launcher.setAttribute('aria-label', 'Open command deck');

  const panel = document.createElement('aside');
  panel.className = 'sigint-exec-deck';
  panel.setAttribute('aria-label', 'Command deck');

  const spotlight = document.createElement('section');
  spotlight.className = 'sigint-exec-spotlight';
  spotlight.dataset.open = 'false';
  spotlight.setAttribute('aria-label', 'Cinematic spotlight');

  host.appendChild(launcher);
  host.appendChild(panel);
  host.appendChild(spotlight);
  bucket.push(() => launcher.remove());
  bucket.push(() => panel.remove());
  bucket.push(() => spotlight.remove());

  let open = readStoredFlag(PANEL_OPEN_STORAGE_KEY, true);
  let touring = readStoredFlag(TOUR_ACTIVE_STORAGE_KEY, false);
  let summary = { score: 0, tone: 'steady', incidents: 0, hotZones: 0, deckOpen: open, touring };
  let incidents = [];
  let snapshots = [];
  let sourceHealthEntries = [];
  let pulse = buildPulse([], {}, {}, []);
  let recentEvents = [];
  let previousTopIncidentIds = [];
  let previousWatchSummary = { zones: 0, hot: 0, newHits: 0, armed: 0 };
  let previousWorkbenchSummary = { new: 0, escalated: 0, resolved: 0 };
  let healthStatusByKey = new Map();
  let tourIndex = 0;
  let tourTimeoutId = null;
  let syncHandle = null;
  let syncQueuedSilent = true;

  const workbenchSummary = () => context.opsWorkbench?.getSummary?.() || { briefed: 0, new: 0, escalated: 0, resolved: 0, collectionGaps: 0 };
  const watchSummary = () => context.watchCenter?.getSummary?.() || { zones: 0, hot: 0, newHits: 0, armed: 0 };

  let lastEmitSignature = '';

  const emitUpdate = () => {
    const detail = { summary, incidents, snapshots };
    const nextSignature = stableSerialize({
      summary,
      incidents: incidents.map((incident) => ({
        id: incident.id,
        priority: incident.priority,
        score: incident.score,
        confidence: incident.confidence,
      })),
      snapshots: snapshots.map((snapshot) => ({
        zoneId: snapshot.zone?.id || '',
        activeCount: snapshot.activeCount,
        newHits: snapshot.newHits?.length || 0,
        topIncidentId: snapshot.topIncident?.id || '',
      })),
      open,
      touring,
    });

    if (nextSignature === lastEmitSignature) return;
    lastEmitSignature = nextSignature;
    dispatchSigintEvent('sigint:executive-deck-update', detail);
    context.onSummaryChange?.(summary);
  };

  const pushActivity = (label, tone = 'info', meta = '') => {
    const safeLabel = String(label || '').trim();
    if (!safeLabel) return;
    const key = `${safeLabel}::${meta}`;
    if (recentEvents[0]?.key === key) return;
    recentEvents = [{ key, label: safeLabel, tone, meta: String(meta || '').trim(), at: Date.now() }, ...recentEvents]
      .slice(0, MAX_ACTIVITY_ITEMS);
  };

  const focusIncident = (incident) => {
    if (!incident) return;
    if (typeof context.focusIncident === 'function') {
      context.focusIncident(incident);
      return;
    }

    const api = getPublicApi();
    api.focusLocation?.(incident.lat, incident.lon, {
      title: incident.title,
      detail: incident.summary || '',
      domain: incident.dominantDomain || 'fusion',
      status: `${incident.priority} / Confidence ${incident.confidence}`,
      source: (incident.sources || []).join(', '),
      url: incident.primaryUrl || '',
      lat: incident.lat,
      lon: incident.lon,
    });
  };

  const getIncidentById = (incidentId) => {
    if (!incidentId) return null;
    return dedupeIncidents([
      ...incidents,
      ...snapshots.map((snapshot) => snapshot.topIncident).filter(Boolean),
    ]).find((incident) => incident.id === incidentId) || null;
  };

  const setLauncherState = () => {
    launcher.dataset.hidden = open ? 'true' : 'false';
    setInnerHtmlIfChanged(launcher, `
      <span class="sigint-exec-launcher__score">${escapeHtml(summary.score)}</span>
      <span>
        <strong>Deck</strong>
        <span class="sigint-exec-launcher__tone">${escapeHtml(summary.toneLabel || 'Steady')}</span>
      </span>
    `, { score: summary.score, toneLabel: summary.toneLabel, open });
  };

  const clearTourTimer = () => {
    if (!tourTimeoutId) return;
    window.clearTimeout(tourTimeoutId);
    tourTimeoutId = null;
  };

  const hideSpotlight = () => {
    spotlight.dataset.open = 'false';
    setInnerHtmlIfChanged(spotlight, '', 'spotlight-empty');
  };

  const getTourPool = () => dedupeIncidents([
    ...incidents,
    ...snapshots.map((snapshot) => snapshot.topIncident).filter(Boolean),
  ]).slice(0, 6);

  const renderSpotlight = (incident, currentIndex, total) => {
    setInnerHtmlIfChanged(spotlight, `
      <div class="sigint-exec-spotlight__top">
        <div>
          <div class="sigint-exec-spotlight__eyebrow">Cinematic tour · ${escapeHtml(currentIndex + 1)} / ${escapeHtml(total)} · pulse ${escapeHtml(summary.score)}</div>
          <div class="sigint-exec-spotlight__title">${escapeHtml(incident.title)}</div>
          <div class="sigint-exec-spotlight__meta">${escapeHtml(incident.priority)} · confidence ${escapeHtml(incident.confidence)} · ${escapeHtml(incident.sourceCount || incident.sources?.length || 0)} sources · ${escapeHtml(formatCoords(incident.lat, incident.lon))}</div>
        </div>
        <span class="sigint-exec-pill" data-tone="${escapeHtml(summary.tone)}">${escapeHtml(summary.toneLabel)}</span>
      </div>
      <div class="sigint-exec-spotlight__summary">${escapeHtml(incident.summary || 'Corroborated activity highlighted for fast executive review.')}</div>
      <div class="sigint-exec-spotlight__actions">
        <button type="button" class="sigint-exec-btn" data-action="spotlight-next">Next</button>
        <button type="button" class="sigint-exec-btn" data-action="spotlight-stop">Stop tour</button>
      </div>
    `, { incidentId: incident.id, currentIndex, total, score: summary.score, tone: summary.tone, touring });
    spotlight.dataset.open = 'true';
  };

  const scheduleTour = () => {
    clearTourTimer();
    if (!touring || document.visibilityState === 'hidden') return;
    tourTimeoutId = window.setTimeout(() => {
      focusNextTourIncident();
    }, 5200);
  };

  const setTouring = (nextValue, options = {}) => {
    touring = !!nextValue;
    writeStoredFlag(TOUR_ACTIVE_STORAGE_KEY, touring);
    if (!touring) {
      clearTourTimer();
      hideSpotlight();
      if (!options.silent) {
        context.showToast?.('Cinematic tour paused.', 'warning');
      }
    } else if (!options.silent) {
      context.showToast?.('Cinematic tour active.', 'success');
    }
    sync({ silent: true });
  };

  function focusNextTourIncident(options = {}) {
    const pool = getTourPool();
    if (!pool.length) {
      if (!options.silent) {
        context.showToast?.('The tour is waiting for live incidents.', 'warning');
      }
      setTouring(false, { silent: true });
      return;
    }

    if (!open) {
      open = true;
      writeStoredFlag(PANEL_OPEN_STORAGE_KEY, true);
    }

    const targetIndex = clamp(tourIndex, 0, Math.max(pool.length - 1, 0));
    const incident = pool[targetIndex] || pool[0];
    tourIndex = (targetIndex + 1) % pool.length;
    focusIncident(incident);
    renderSpotlight(incident, targetIndex, pool.length);
    scheduleTour();
    if (!options.silent) {
      pushActivity(`Tour focus: ${incident.title}`, 'success', `${incident.priority} · confidence ${incident.confidence}`);
    }
    render();
  }

  const copyDigest = async () => {
    try {
      await copyText(buildDeckDigest(pulse, incidents, snapshots, workbenchSummary(), sourceHealthEntries, recentEvents));
      context.showToast?.('Command deck digest copied.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Command deck digest copy failed:', error);
      context.showToast?.('Unable to copy the command deck digest.', 'danger');
    }
  };

  const setOpen = (nextOpen, options = {}) => {
    open = !!nextOpen;
    writeStoredFlag(PANEL_OPEN_STORAGE_KEY, open);
    if (!open) {
      if (touring) {
        touring = false;
        writeStoredFlag(TOUR_ACTIVE_STORAGE_KEY, false);
        clearTourTimer();
      }
      hideSpotlight();
    }
    render();
    if (!options.silent) {
      context.showToast?.(open ? 'Command deck open.' : 'Command deck hidden.', open ? 'success' : 'warning');
    }
  };

  const render = () => {
    panel.dataset.open = open ? 'true' : 'false';
    setLauncherState();

    if (!open) {
      setInnerHtmlIfChanged(panel, '', 'deck-closed');
      panel.dataset.digest = '';
      emitUpdate();
      return;
    }

    const deckDigest = buildDeckDigest(pulse, incidents, snapshots, workbenchSummary(), sourceHealthEntries, recentEvents);
    setInnerHtmlIfChanged(panel, `
      <div class="sigint-exec-head">
        <div class="sigint-exec-eyebrow">Command deck</div>
        <div class="sigint-exec-title-row">
          <div class="sigint-exec-title">
            ${escapeHtml(summary.toneLabel)}
            <span class="sigint-exec-title__score">Pulse ${escapeHtml(summary.score)}</span>
          </div>
          <span class="sigint-exec-pill" data-tone="${escapeHtml(summary.tone)}">${escapeHtml(summary.toneLabel)}</span>
        </div>
        <div class="sigint-exec-description">${escapeHtml(pulse.description)}</div>
        <div class="sigint-exec-actions">
          <button type="button" class="sigint-exec-btn" data-action="tour" ${touring ? 'data-active="true"' : ''}>${touring ? 'Pause tour' : 'Start tour'}</button>
          <button type="button" class="sigint-exec-btn" data-action="founder" ${context.isFounderMode?.() ? 'data-active="true"' : ''}>${context.isFounderMode?.() ? 'Exit founder' : 'Founder mode'}</button>
          <button type="button" class="sigint-exec-btn" data-action="caption">Caption</button>
          <button type="button" class="sigint-exec-btn" data-action="poster">Poster</button>
          <button type="button" class="sigint-exec-btn" data-action="copy">Copy deck</button>
          <button type="button" class="sigint-exec-btn" data-action="save">Save view</button>
          <button type="button" class="sigint-exec-btn" data-action="brief">Copy brief</button>
          <button type="button" class="sigint-exec-btn" data-action="close">Hide</button>
        </div>
      </div>
      <div class="sigint-exec-body">
        <div class="sigint-exec-grid">
          <div class="sigint-exec-stat">
            <div class="sigint-exec-stat__label">P1 incidents</div>
            <div class="sigint-exec-stat__value">${escapeHtml(pulse.critical)}</div>
            <div class="sigint-exec-stat__meta">${escapeHtml(incidents.length)} corroborated live</div>
          </div>
          <div class="sigint-exec-stat">
            <div class="sigint-exec-stat__label">Hot zones</div>
            <div class="sigint-exec-stat__value">${escapeHtml(pulse.hotZones)}</div>
            <div class="sigint-exec-stat__meta">${escapeHtml(watchSummary().zones || 0)} watch zones armed</div>
          </div>
          <div class="sigint-exec-stat">
            <div class="sigint-exec-stat__label">Delta</div>
            <div class="sigint-exec-stat__value">${escapeHtml(pulse.deltaNew + pulse.deltaEscalated)}</div>
            <div class="sigint-exec-stat__meta">${escapeHtml(pulse.deltaNew)} new · ${escapeHtml(pulse.deltaEscalated)} escalated</div>
          </div>
          <div class="sigint-exec-stat">
            <div class="sigint-exec-stat__label">Feeds</div>
            <div class="sigint-exec-stat__value">${escapeHtml(pulse.degradedSources.length)}</div>
            <div class="sigint-exec-stat__meta">${escapeHtml(sourceHealthEntries.length)} tracked · ${escapeHtml(pulse.staleSources.length)} stale</div>
          </div>
        </div>

        <section class="sigint-exec-section">
          <div class="sigint-exec-section__head">
            <div class="sigint-exec-section__title">Lead incidents</div>
            <div class="sigint-exec-section__meta">fusion-first view</div>
          </div>
          <div class="sigint-exec-list">
            ${incidents.length ? incidents.slice(0, 3).map((incident, index) => `
              <article class="sigint-exec-card" data-incident-id="${escapeHtml(incident.id)}">
                <div class="sigint-exec-card__head">
                  <div>
                    <div class="sigint-exec-card__title">${escapeHtml(index + 1)}. ${escapeHtml(incident.title)}</div>
                    <div class="sigint-exec-card__meta">${escapeHtml(incident.sources.join(' + '))} · ${escapeHtml(formatCoords(incident.lat, incident.lon))}</div>
                  </div>
                  <span class="sigint-exec-badge" data-priority="${escapeHtml(incident.priority)}">${escapeHtml(incident.priority)}</span>
                </div>
                <div class="sigint-exec-badges">
                  <span class="sigint-exec-badge">Confidence ${escapeHtml(incident.confidence)}</span>
                  <span class="sigint-exec-badge">${escapeHtml(incident.sourceCount)} sources</span>
                  <span class="sigint-exec-badge">Fresh ${escapeHtml(incident.freshnessLabel || '—')}</span>
                </div>
                <div class="sigint-exec-card__summary">${escapeHtml(incident.summary || 'Corroborated activity highlighted for rapid triage.')}</div>
                <div class="sigint-exec-card__actions">
                  <button type="button" class="sigint-exec-btn" data-action="incident-focus" data-incident-id="${escapeHtml(incident.id)}">Focus</button>
                  <button type="button" class="sigint-exec-btn" data-action="incident-track" data-incident-id="${escapeHtml(incident.id)}">Track</button>
                  <button type="button" class="sigint-exec-btn" data-action="incident-brief" data-incident-id="${escapeHtml(incident.id)}">Brief</button>
                </div>
              </article>
            `).join('') : '<div class="sigint-exec-empty">The deck is waiting for live corroborated incidents. As sources overlap, the strongest signals will land here automatically.</div>'}
          </div>
        </section>

        <section class="sigint-exec-section">
          <div class="sigint-exec-section__head">
            <div class="sigint-exec-section__title">Watch hotspots</div>
            <div class="sigint-exec-section__meta">regional persistence</div>
          </div>
          <div class="sigint-exec-list">
            ${snapshots.length ? snapshots.slice(0, 3).map((snapshot) => `
              <article class="sigint-exec-card" data-zone-id="${escapeHtml(snapshot.zone.id)}">
                <div class="sigint-exec-card__head">
                  <div>
                    <div class="sigint-exec-card__title">${escapeHtml(snapshot.zone.name)}</div>
                    <div class="sigint-exec-card__meta">${escapeHtml(snapshot.zone.domain)} · ${escapeHtml(snapshot.zone.radiusKm)} km · ${escapeHtml(formatCoords(snapshot.zone.lat, snapshot.zone.lon))}</div>
                  </div>
                  <span class="sigint-exec-badge" data-tone="${snapshot.hot ? 'warning' : 'steady'}">${snapshot.hot ? 'Hot' : 'Watch'}</span>
                </div>
                <div class="sigint-exec-badges">
                  <span class="sigint-exec-badge">${escapeHtml(snapshot.activeCount)} active</span>
                  <span class="sigint-exec-badge">${escapeHtml(snapshot.newHits.length)} new</span>
                  <span class="sigint-exec-badge">${escapeHtml(snapshot.resolvedIds.length)} resolved</span>
                </div>
                <div class="sigint-exec-card__summary">${escapeHtml(snapshot.topIncident ? `${snapshot.topIncident.priority} ${snapshot.topIncident.title}` : 'No top incident in this zone right now.')}</div>
                <div class="sigint-exec-card__actions">
                  <button type="button" class="sigint-exec-btn" data-action="zone-focus" data-zone-id="${escapeHtml(snapshot.zone.id)}">Focus</button>
                  ${snapshot.topIncident ? `<button type="button" class="sigint-exec-btn" data-action="zone-brief" data-zone-id="${escapeHtml(snapshot.zone.id)}">Promote</button>` : ''}
                </div>
              </article>
            `).join('') : '<div class="sigint-exec-empty">No watch zones are active yet. Track a fused incident or open Watch Center to build persistent regional coverage.</div>'}
          </div>
        </section>

        <section class="sigint-exec-section">
          <div class="sigint-exec-section__head">
            <div class="sigint-exec-section__title">Recent activity</div>
            <div class="sigint-exec-section__meta">operator pulse</div>
          </div>
          <div class="sigint-exec-activity">
            ${recentEvents.length ? recentEvents.map((entry) => `
              <div class="sigint-exec-activity__item">
                <span class="sigint-exec-activity__tone" data-tone="${escapeHtml(entry.tone === 'info' ? 'success' : entry.tone)}"></span>
                <div>
                  <div class="sigint-exec-activity__label">${escapeHtml(entry.label)}</div>
                  ${entry.meta ? `<div class="sigint-exec-activity__meta">${escapeHtml(entry.meta)}</div>` : ''}
                </div>
                <div class="sigint-exec-activity__time">${escapeHtml(new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</div>
              </div>
            `).join('') : '<div class="sigint-exec-empty">Activity will appear here as the fused picture changes, watch zones trigger, or source health shifts.</div>'}
          </div>
        </section>
      </div>
    `, {
      summary,
      pulse,
      incidents: incidents.map((incident) => ({ id: incident.id, priority: incident.priority, score: incident.score, confidence: incident.confidence })),
      snapshots: snapshots.map((snapshot) => ({ zoneId: snapshot.zone?.id || '', activeCount: snapshot.activeCount, newHits: snapshot.newHits?.length || 0, topIncidentId: snapshot.topIncident?.id || '' })),
      recentEvents,
      touring,
      founderMode: context.showcaseSuite?.isFounderMode?.() || false,
    });

    panel.dataset.digest = deckDigest;
    emitUpdate();
  };

  const sync = (options = {}) => {
    incidents = Array.isArray(context.fusionCenter?.getIncidents?.())
      ? [...context.fusionCenter.getIncidents()]
      : [];
    snapshots = Array.isArray(context.watchCenter?.getSnapshots?.())
      ? [...context.watchCenter.getSnapshots()]
      : [];
    sourceHealthEntries = Object.values(getSigintSourceHealth());

    const watchStats = watchSummary();
    const workbenchStats = workbenchSummary();
    pulse = buildPulse(incidents, watchStats, workbenchStats, sourceHealthEntries);
    summary = {
      score: pulse.score,
      tone: pulse.tone,
      toneLabel: pulse.toneLabel,
      incidents: incidents.length,
      hotZones: pulse.hotZones,
      degraded: pulse.degradedSources.length,
      deckOpen: open,
      touring,
    };

    if (!options.silent) {
      const nextTopIds = incidents.slice(0, 3).map((incident) => incident.id);
      incidents.slice(0, 2).forEach((incident) => {
        if (!previousTopIncidentIds.includes(incident.id)) {
          pushActivity(`${incident.priority} incident surfaced: ${incident.title}`, incident.priority === 'P1' ? 'danger' : 'warning', `${incident.sourceCount} sources · confidence ${incident.confidence}`);
        }
      });
      previousTopIncidentIds = nextTopIds;

      const watchDelta = watchStats.newHits - Number(previousWatchSummary.newHits || 0);
      if (watchDelta > 0) {
        const snapshot = snapshots.find((entry) => entry.newHits.length > 0) || snapshots[0];
        if (snapshot) {
          pushActivity(`Watch zone update: ${snapshot.zone.name}`, 'warning', `${snapshot.newHits.length} new hit${snapshot.newHits.length === 1 ? '' : 's'}`);
        }
      }
      previousWatchSummary = { ...watchStats };

      if ((workbenchStats.new || 0) > Number(previousWorkbenchSummary.new || 0) || (workbenchStats.escalated || 0) > Number(previousWorkbenchSummary.escalated || 0)) {
        pushActivity('Briefing delta moved.', 'success', `${workbenchStats.new || 0} new · ${workbenchStats.escalated || 0} escalated`);
      }
      previousWorkbenchSummary = { ...workbenchStats };
    }

    render();
  };

  const cancelScheduledSync = () => {
    if (!syncHandle) return;
    if (typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(syncHandle);
    } else {
      window.clearTimeout(syncHandle);
    }
    syncHandle = null;
  };

  const flushScheduledSync = () => {
    syncHandle = null;
    const silent = syncQueuedSilent;
    syncQueuedSilent = true;
    sync({ silent });
  };

  const scheduleSync = (options = {}) => {
    syncQueuedSilent = syncQueuedSilent && !!options.silent;
    if (syncHandle) return;
    if (typeof window.requestAnimationFrame === 'function') {
      syncHandle = window.requestAnimationFrame(flushScheduledSync);
    } else {
      syncHandle = window.setTimeout(flushScheduledSync, 16);
    }
  };

  const onPanelClick = (event) => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;
    const incidentId = actionTarget.dataset.incidentId || actionTarget.closest('[data-incident-id]')?.dataset.incidentId || '';
    const zoneId = actionTarget.dataset.zoneId || actionTarget.closest('[data-zone-id]')?.dataset.zoneId || '';
    const incident = getIncidentById(incidentId);
    const snapshot = snapshots.find((entry) => entry.zone?.id === zoneId) || null;

    if (action === 'close') {
      setOpen(false, { silent: true });
      return;
    }
    if (action === 'copy') {
      copyDigest();
      return;
    }
    if (action === 'caption') {
      context.copyShowcaseCaption?.();
      return;
    }
    if (action === 'poster') {
      context.exportShowcasePoster?.();
      return;
    }
    if (action === 'founder') {
      context.toggleFounderMode?.();
      return;
    }
    if (action === 'save') {
      context.saveCurrentView?.();
      return;
    }
    if (action === 'brief') {
      context.copyWorkbenchBrief?.();
      return;
    }
    if (action === 'tour') {
      if (touring) {
        setTouring(false, { silent: false });
      } else {
        setTouring(true, { silent: true });
        focusNextTourIncident({ silent: true });
      }
      return;
    }
    if (action === 'incident-focus' && incident) {
      focusIncident(incident);
      pushActivity(`Focused ${incident.title}`, 'success', `${incident.priority} · ${incident.sourceCount} sources`);
      return;
    }
    if (action === 'incident-track' && incident) {
      context.addWatchZoneFromIncident?.(incident);
      pushActivity(`Tracking ${incident.title}`, 'success', 'Watch zone created');
      return;
    }
    if (action === 'incident-brief' && incident) {
      context.addBriefItem?.(incident);
      pushActivity(`Promoted ${incident.title}`, 'success', 'Added to workbench brief');
      return;
    }
    if (action === 'zone-focus' && snapshot) {
      context.focusWatchZone?.(snapshot.zone.id);
      pushActivity(`Focused watch zone ${snapshot.zone.name}`, 'success', `${snapshot.activeCount} active`);
      return;
    }
    if (action === 'zone-brief' && snapshot?.topIncident) {
      context.addBriefItem?.(snapshot.topIncident);
      pushActivity(`Promoted zone ${snapshot.zone.name}`, 'success', snapshot.topIncident.title);
    }
  };

  const onLauncherClick = () => {
    setOpen(true, { silent: true });
  };

  const onSpotlightClick = (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'spotlight-stop') {
      setTouring(false, { silent: false });
      return;
    }
    if (action === 'spotlight-next') {
      focusNextTourIncident({ silent: true });
    }
  };

  const onFusionUpdated = () => {
    scheduleSync({ silent: false });
  };

  const onWatchUpdated = () => {
    scheduleSync({ silent: false });
  };

  const onWorkbenchUpdated = () => {
    scheduleSync({ silent: false });
  };

  const onSourceHealth = (event) => {
    const detail = event.detail || {};
    const previousStatus = healthStatusByKey.get(detail.key);
    if (detail?.key && previousStatus !== detail.status) {
      if (detail.status === 'error') {
        pushActivity(`Feed degraded: ${detail.label || detail.key}`, 'danger', detail.error || 'fetch failure');
      } else if (previousStatus === 'error' && detail.status === 'live') {
        pushActivity(`Feed restored: ${detail.label || detail.key}`, 'success', `Latency ${detail.latencyMs || '—'} ms`);
      }
      healthStatusByKey.set(detail.key, detail.status);
    }
    scheduleSync({ silent: true });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      clearTourTimer();
      return;
    }
    if (touring) {
      scheduleTour();
    }
    scheduleSync({ silent: true });
  };

  const onKeyDown = (event) => {
    const tagName = event.target?.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === 'v' || event.key === 'V') {
      event.preventDefault();
      setOpen(!open, { silent: true });
      return;
    }

    if (event.key === 't' || event.key === 'T') {
      event.preventDefault();
      if (touring) setTouring(false, { silent: false });
      else {
        setTouring(true, { silent: true });
        focusNextTourIncident({ silent: true });
      }
    }
  };

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    scheduleSync({ silent: true });
  }, 30000);

  launcher.addEventListener('click', onLauncherClick);
  panel.addEventListener('click', onPanelClick);
  spotlight.addEventListener('click', onSpotlightClick);
  window.addEventListener('sigint:fusion-updated', onFusionUpdated);
  window.addEventListener('sigint:watch-center-update', onWatchUpdated);
  window.addEventListener('sigint:ops-workbench-update', onWorkbenchUpdated);
  window.addEventListener('sigint:source-health', onSourceHealth);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('keydown', onKeyDown);

  bucket.push(() => launcher.removeEventListener('click', onLauncherClick));
  bucket.push(() => panel.removeEventListener('click', onPanelClick));
  bucket.push(() => spotlight.removeEventListener('click', onSpotlightClick));
  bucket.push(() => window.removeEventListener('sigint:fusion-updated', onFusionUpdated));
  bucket.push(() => window.removeEventListener('sigint:watch-center-update', onWatchUpdated));
  bucket.push(() => window.removeEventListener('sigint:ops-workbench-update', onWorkbenchUpdated));
  bucket.push(() => window.removeEventListener('sigint:source-health', onSourceHealth));
  bucket.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));
  bucket.push(() => document.removeEventListener('keydown', onKeyDown));
  bucket.push(() => window.clearInterval(intervalId));
  bucket.push(() => clearTourTimer());
  bucket.push(() => cancelScheduledSync());
  bucket.push(() => hideSpotlight());

  pushActivity('Command deck online.', 'success', 'Fusion, watch, brief, and feed health unified');
  sync({ silent: true });
  if (touring) {
    focusNextTourIncident({ silent: true });
  }

  window.__SIGINT_MAP_EXECUTIVE_DECK__ = {
    open: () => setOpen(true, { silent: true }),
    close: () => setOpen(false, { silent: true }),
    toggle: () => setOpen(!open, { silent: true }),
    startTour: () => {
      setTouring(true, { silent: true });
      focusNextTourIncident({ silent: true });
    },
    stopTour: () => setTouring(false, { silent: true }),
    copyDigest,
    getSummary: () => summary,
    isOpen: () => open,
    isTouring: () => touring,
    render: () => sync({ silent: true }),
  };
  bucket.push(() => { delete window.__SIGINT_MAP_EXECUTIVE_DECK__; });

  return {
    open: () => setOpen(true, { silent: true }),
    close: () => setOpen(false, { silent: true }),
    toggle: () => setOpen(!open, { silent: true }),
    startTour: () => {
      setTouring(true, { silent: true });
      focusNextTourIncident({ silent: true });
    },
    stopTour: () => setTouring(false, { silent: true }),
    toggleTour: () => {
      if (touring) setTouring(false, { silent: true });
      else {
        setTouring(true, { silent: true });
        focusNextTourIncident({ silent: true });
      }
    },
    copyDigest,
    getSummary: () => summary,
    isOpen: () => open,
    isTouring: () => touring,
    render: () => sync({ silent: true }),
  };
}
