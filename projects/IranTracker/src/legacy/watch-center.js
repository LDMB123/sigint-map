import {
  copyText,
  dispatchSigintEvent,
  escapeHtml,
  formatAge,
  formatCoords,
  haversineKm,
  getSigintPublicApi as getPublicApi,
  readStoredFlag,
  readStoredJson,
  setInnerHtmlIfChanged,
  setTextContentIfChanged,
  stableSerialize,
  writeStoredFlag,
  writeStoredJson,
} from './shared-utils.js';

const ZONES_STORAGE_KEY = 'sigint-map:watch-zones:v1';
const PANEL_OPEN_STORAGE_KEY = 'sigint-map:watch-center-open:v1';

const PRIORITY_WEIGHT = {
  P1: 3,
  P2: 2,
  P3: 1,
};

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'All domains' },
  { value: 'air', label: 'Air' },
  { value: 'maritime', label: 'Maritime' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'thermal', label: 'Thermal' },
  { value: 'seismic', label: 'Seismic' },
  { value: 'weather', label: 'Weather' },
  { value: 'radiation', label: 'Radiation' },
  { value: 'sigmet', label: 'SIGMET' },
  { value: 'intercepts', label: 'Intercepts' },
  { value: 'impacts', label: 'Impacts' },
  { value: 'naval', label: 'Naval' },
];

function clampRadius(value) {
  const numeric = Math.round(Number(value) || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 150;
  return Math.min(Math.max(numeric, 25), 2500);
}

function normalizePriority(priority) {
  const normalized = String(priority || 'P3').toUpperCase();
  return PRIORITY_WEIGHT[normalized] ? normalized : 'P3';
}

function normalizeDomain(domain) {
  const normalized = String(domain || 'all').trim().toLowerCase();
  return DOMAIN_OPTIONS.some((option) => option.value === normalized) ? normalized : 'all';
}

function priorityWeight(priority) {
  return PRIORITY_WEIGHT[normalizePriority(priority)] || 0;
}

function compareIncidents(left, right) {
  return priorityWeight(right.priority) - priorityWeight(left.priority)
    || (Number(right.score) || 0) - (Number(left.score) || 0)
    || (Number(right.confidence) || 0) - (Number(left.confidence) || 0)
    || (right.freshestTimestamp || 0) - (left.freshestTimestamp || 0)
    || String(left.title || '').localeCompare(String(right.title || ''));
}

function domainLabel(value) {
  return DOMAIN_OPTIONS.find((option) => option.value === value)?.label || 'All domains';
}

function buildZoneId() {
  return `watch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeZone(zone) {
  const lat = Number(zone?.lat);
  const lon = Number(zone?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    id: String(zone?.id || buildZoneId()),
    name: String(zone?.name || 'Watch Zone').trim().slice(0, 80) || 'Watch Zone',
    lat,
    lon,
    radiusKm: clampRadius(zone?.radiusKm),
    minPriority: normalizePriority(zone?.minPriority),
    domain: normalizeDomain(zone?.domain),
    armed: zone?.armed !== false,
    createdAt: Number(zone?.createdAt) || Date.now(),
    updatedAt: Number(zone?.updatedAt) || Date.now(),
    sourceIncidentId: zone?.sourceIncidentId ? String(zone.sourceIncidentId) : '',
  };
}

function loadZones() {
  const raw = readStoredJson(ZONES_STORAGE_KEY, []);
  return Array.isArray(raw)
    ? raw.map((entry) => sanitizeZone(entry)).filter(Boolean).slice(0, 16)
    : [];
}

function saveZones(zones) {
  writeStoredJson(
    ZONES_STORAGE_KEY,
    zones.map((zone) => sanitizeZone(zone)).filter(Boolean).slice(0, 16),
  );
}

function suggestRadiusKm(incident) {
  const domain = String(incident?.dominantDomain || '').toLowerCase();
  if (domain === 'weather') return 320;
  if (domain === 'maritime' || domain === 'naval') return 260;
  if (domain === 'air' || domain === 'intercepts' || domain === 'sigmet') return 220;
  if (domain === 'seismic') return 180;
  if (domain === 'radiation') return 140;
  if (domain === 'thermal' || domain === 'conflict' || domain === 'impacts') return 120;
  return 150;
}

function buildZoneFromIncident(incident) {
  return sanitizeZone({
    name: String(incident?.title || 'Tracked activity').slice(0, 80),
    lat: Number(incident?.lat) || 0,
    lon: Number(incident?.lon) || 0,
    radiusKm: suggestRadiusKm(incident),
    minPriority: normalizePriority(incident?.priority),
    domain: normalizeDomain(incident?.dominantDomain || 'all'),
    armed: true,
    sourceIncidentId: String(incident?.id || ''),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

function incidentMatchesZone(incident, zone) {
  if (!incident) return false;

  if (priorityWeight(incident.priority) < priorityWeight(zone.minPriority)) {
    return false;
  }

  if (zone.domain !== 'all') {
    const domains = Array.isArray(incident.domains)
      ? incident.domains.map((value) => String(value || '').toLowerCase())
      : [];
    const dominantDomain = String(incident.dominantDomain || '').toLowerCase();
    const matchesDomain = zone.domain === dominantDomain || domains.includes(zone.domain);
    if (!matchesDomain) return false;
  }

  return haversineKm(zone.lat, zone.lon, Number(incident.lat) || 0, Number(incident.lon) || 0) <= zone.radiusKm;
}

function buildZoneDetail(zone, snapshot) {
  const lines = [
    `Watch zone: ${zone.name}`,
    `Center: ${formatCoords(zone.lat, zone.lon)}`,
    `Radius: ${zone.radiusKm} km`,
    `Domain: ${domainLabel(zone.domain)}`,
    `Priority floor: ${zone.minPriority}`,
    '',
  ];

  if (!snapshot?.activeCount) {
    lines.push('No active corroborated incidents inside this zone.');
    return lines.join('\n');
  }

  lines.push(`Active hits: ${snapshot.activeCount}`);
  lines.push(`New since last scan: ${snapshot.newHits.length}`);
  lines.push(`Resolved since last scan: ${snapshot.resolvedIds.length}`);
  lines.push('');

  snapshot.hits.slice(0, 5).forEach((incident, index) => {
    lines.push(`${index + 1}. ${incident.priority} | ${incident.title} | ${incident.sources.join(', ')} | ${formatCoords(incident.lat, incident.lon)}`);
  });

  return lines.join('\n');
}

function buildZoneDigest(snapshot) {
  const zone = snapshot.zone;
  const lines = [
    `Watch Zone — ${zone.name}`,
    `Center: ${formatCoords(zone.lat, zone.lon)}`,
    `Radius: ${zone.radiusKm} km`,
    `Domain: ${domainLabel(zone.domain)}`,
    `Priority floor: ${zone.minPriority}`,
    `Active hits: ${snapshot.activeCount}`,
    `New since last scan: ${snapshot.newHits.length}`,
    `Resolved since last scan: ${snapshot.resolvedIds.length}`,
    '',
  ];

  if (!snapshot.hits.length) {
    lines.push('No corroborated incidents currently match this watch zone.');
    return lines.join('\n');
  }

  snapshot.hits.slice(0, 5).forEach((incident, index) => {
    lines.push(`${index + 1}. ${incident.priority} | ${incident.title} | Confidence ${incident.confidence} | ${incident.sources.join(', ')} | ${formatCoords(incident.lat, incident.lon)}`);
  });

  return lines.join('\n');
}

function buildDigest(snapshots, summary) {
  if (!snapshots.length) {
    return 'Watch Center: no watch zones configured.';
  }

  const lines = [
    'Regional Watch Center Digest',
    `Zones: ${summary.zones} | Hot: ${summary.hot} | New hits: ${summary.newHits} | Armed: ${summary.armed}`,
    '',
  ];

  snapshots.slice(0, 6).forEach((snapshot, index) => {
    const zone = snapshot.zone;
    lines.push(`${index + 1}. ${zone.name} | ${zone.radiusKm} km | ${domainLabel(zone.domain)} | ${snapshot.activeCount} active | ${snapshot.newHits.length} new | ${formatCoords(zone.lat, zone.lon)}`);
    snapshot.hits.slice(0, 3).forEach((incident) => {
      lines.push(`   - ${incident.priority} | ${incident.title} | ${incident.sources.join(', ')}`);
    });
    if (!snapshot.hits.length) {
      lines.push('   - No active corroborated incidents');
    }
  });

  return lines.join('\n');
}

function maybeNotify(snapshot, context) {
  if (!snapshot.shouldAlert) return;

  const topIncident = snapshot.topIncident;
  const message = topIncident
    ? `${snapshot.zone.name}: ${snapshot.newHits.length || 1} new hit${snapshot.newHits.length === 1 ? '' : 's'} — ${topIncident.priority} ${topIncident.title}`
    : `${snapshot.zone.name}: watch zone activity changed.`;

  if (document.visibilityState !== 'hidden') {
    context.showToast?.(message, topIncident?.priority === 'P1' ? 'warning' : 'success');
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification('SIGINT-MAP Watch Center', {
        body: message,
        tag: `sigint-watch-${snapshot.zone.id}`,
        renotify: true,
      });
      window.setTimeout(() => notification.close(), 6000);
      notification.onclick = () => {
        try {
          window.focus();
        } catch {
          // ignore focus failures
        }
      };
      return;
    } catch {
      // fall through to toast when Notification fails
    }
  }

  context.showToast?.(message, topIncident?.priority === 'P1' ? 'warning' : 'success');
}

function injectStyles() {
  if (document.getElementById('sigint-watch-styles')) return;

  const style = document.createElement('style');
  style.id = 'sigint-watch-styles';
  style.textContent = `
    .sigint-watch-panel {
      position: fixed;
      top: 52px;
      right: 12px;
      width: min(460px, calc(100vw - 24px));
      max-height: calc(100vh - 72px);
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(7,11,18,0.92);
      box-shadow: 0 24px 80px rgba(0,0,0,0.48);
      backdrop-filter: blur(14px);
      color: var(--color-text);
      z-index: 10006;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-8px) scale(0.98);
      transition: opacity 160ms ease, transform 160ms ease;
      overflow: hidden;
    }
    .sigint-watch-panel[data-open="true"] {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }
    [data-theme="light"] .sigint-watch-panel {
      background: rgba(240,243,248,0.95);
      border-color: rgba(0,0,0,0.08);
      box-shadow: 0 24px 80px rgba(15,23,42,0.14);
    }
    .sigint-watch-header,
    .sigint-watch-summary,
    .sigint-watch-form,
    .sigint-watch-zone,
    .sigint-watch-suggestions {
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    [data-theme="light"] .sigint-watch-header,
    [data-theme="light"] .sigint-watch-summary,
    [data-theme="light"] .sigint-watch-form,
    [data-theme="light"] .sigint-watch-zone,
    [data-theme="light"] .sigint-watch-suggestions {
      border-bottom-color: rgba(0,0,0,0.06);
    }
    .sigint-watch-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 12px;
    }
    .sigint-watch-title {
      font-family: var(--font-display);
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sigint-watch-meta {
      margin-top: 4px;
      color: var(--color-text-muted);
      font-size: 11px;
      line-height: 1.5;
    }
    .sigint-watch-actions,
    .sigint-watch-zone__actions,
    .sigint-watch-suggestions__list,
    .sigint-watch-zone__top,
    .sigint-watch-summary-grid {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .sigint-watch-btn,
    .sigint-watch-chip,
    .sigint-watch-suggestion {
      border: none;
      outline: none;
      cursor: pointer;
      font: inherit;
    }
    .sigint-watch-btn,
    .sigint-watch-suggestion {
      min-height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.05);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transition: background 120ms ease, transform 120ms ease, box-shadow 120ms ease;
    }
    .sigint-watch-btn:hover,
    .sigint-watch-btn:focus-visible,
    .sigint-watch-suggestion:hover,
    .sigint-watch-suggestion:focus-visible {
      background: rgba(0,212,255,0.12);
      box-shadow: 0 0 0 1px rgba(0,212,255,0.18);
      transform: translateY(-1px);
    }
    .sigint-watch-btn[data-active="true"] {
      background: rgba(34,197,94,0.14);
      box-shadow: 0 0 0 1px rgba(34,197,94,0.2);
      color: #86efac;
    }
    .sigint-watch-body {
      overflow: auto;
    }
    .sigint-watch-summary {
      padding: 12px;
    }
    .sigint-watch-summary-card {
      flex: 1 1 calc(50% - 8px);
      min-width: 130px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
    }
    [data-theme="light"] .sigint-watch-summary-card {
      background: rgba(255,255,255,0.6);
      border-color: rgba(0,0,0,0.06);
    }
    .sigint-watch-summary-card__label {
      color: var(--color-text-muted);
      font-size: 10px;
      font-family: var(--font-mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sigint-watch-summary-card__value {
      margin-top: 4px;
      font-family: var(--font-display);
      font-size: 18px;
      line-height: 1.1;
    }
    .sigint-watch-form {
      padding: 12px;
      display: grid;
      gap: 10px;
    }
    .sigint-watch-form-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .sigint-watch-form-grid--compact {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .sigint-watch-input,
    .sigint-watch-select {
      width: 100%;
      min-height: 36px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: var(--color-text);
      font: inherit;
      padding: 0 10px;
      box-sizing: border-box;
    }
    [data-theme="light"] .sigint-watch-input,
    [data-theme="light"] .sigint-watch-select {
      border-color: rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.7);
    }
    .sigint-watch-input::placeholder {
      color: var(--color-text-faint);
    }
    .sigint-watch-form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .sigint-watch-form-note,
    .sigint-watch-empty,
    .sigint-watch-zone__meta,
    .sigint-watch-zone__summary,
    .sigint-watch-hits,
    .sigint-watch-suggestions__meta {
      color: var(--color-text-muted);
      font-size: 11px;
      line-height: 1.5;
    }
    .sigint-watch-suggestions,
    .sigint-watch-zone {
      padding: 12px;
    }
    .sigint-watch-suggestions__title,
    .sigint-watch-zones-title,
    .sigint-watch-zone__title {
      font-family: var(--font-mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sigint-watch-suggestions__meta {
      margin-top: 4px;
      margin-bottom: 10px;
    }
    .sigint-watch-zone__top {
      justify-content: space-between;
      align-items: flex-start;
    }
    .sigint-watch-chip {
      min-height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sigint-watch-chip[data-tone="hot"] {
      background: rgba(239,68,68,0.14);
      color: #fca5a5;
    }
    .sigint-watch-chip[data-tone="armed"] {
      background: rgba(34,197,94,0.14);
      color: #86efac;
    }
    .sigint-watch-chip[data-tone="idle"] {
      background: rgba(148,163,184,0.12);
      color: var(--color-text-muted);
    }
    .sigint-watch-chip[data-tone="new"] {
      background: rgba(0,212,255,0.14);
      color: #7dd3fc;
    }
    .sigint-watch-zone__summary {
      margin: 8px 0;
    }
    .sigint-watch-hits {
      display: grid;
      gap: 6px;
      margin-bottom: 10px;
    }
    .sigint-watch-hit {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
    }
    [data-theme="light"] .sigint-watch-hit {
      background: rgba(255,255,255,0.6);
      border-color: rgba(0,0,0,0.05);
    }
    .sigint-watch-hit__title {
      color: var(--color-text);
      font-size: 12px;
      line-height: 1.4;
    }
    .sigint-watch-hit__meta {
      color: var(--color-text-faint);
      font-size: 10px;
      line-height: 1.4;
    }
    .sigint-watch-empty {
      padding: 14px 12px;
    }
    @media (max-width: 720px) {
      .sigint-watch-panel {
        top: 56px;
        right: 8px;
        left: 8px;
        width: auto;
      }
      .sigint-watch-form-grid,
      .sigint-watch-form-grid--compact {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .sigint-watch-summary-card {
        min-width: calc(50% - 8px);
      }
    }
  `;

  document.head.appendChild(style);
}

export function createWatchCenter(bucket, context) {
  injectStyles();

  const panel = document.createElement('section');
  panel.className = 'sigint-watch-panel';
  panel.dataset.open = 'false';
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('aria-label', 'Regional watch center');
  panel.innerHTML = `
    <div class="sigint-watch-header">
      <div>
        <div class="sigint-watch-title">Regional Watch Center</div>
        <div class="sigint-watch-meta">Geo-fenced watch zones that surface new corroborated incidents, delta movement, and fast analyst handoff.</div>
      </div>
      <div class="sigint-watch-actions">
        <button type="button" class="sigint-watch-btn" data-role="copy">Copy digest</button>
        <button type="button" class="sigint-watch-btn" data-role="alerts">Arm all</button>
        <button type="button" class="sigint-watch-btn" data-role="close">Close</button>
      </div>
    </div>
    <div class="sigint-watch-body">
      <div class="sigint-watch-summary"></div>
      <form class="sigint-watch-form">
        <div class="sigint-watch-zones-title">Create watch zone</div>
        <input type="text" class="sigint-watch-input" name="name" maxlength="80" placeholder="Name (e.g. Bab el-Mandeb / Haifa / Strait watch)" />
        <div class="sigint-watch-form-grid">
          <input type="number" class="sigint-watch-input" name="lat" step="0.01" placeholder="Latitude" />
          <input type="number" class="sigint-watch-input" name="lon" step="0.01" placeholder="Longitude" />
          <input type="number" class="sigint-watch-input" name="radius" min="25" max="2500" step="5" placeholder="Radius km" />
          <select class="sigint-watch-select" name="domain">
            ${DOMAIN_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
          </select>
        </div>
        <div class="sigint-watch-form-grid sigint-watch-form-grid--compact">
          <select class="sigint-watch-select" name="priority">
            <option value="P3">P3+ floor</option>
            <option value="P2">P2+ floor</option>
            <option value="P1">P1 only</option>
          </select>
          <button type="submit" class="sigint-watch-btn">Add zone</button>
          <button type="button" class="sigint-watch-btn" data-role="clear-form">Reset</button>
        </div>
        <div class="sigint-watch-form-note">Tip: use quick-track buttons below to create zones from the live fusion picture with a tuned radius.</div>
      </form>
      <div class="sigint-watch-suggestions"></div>
      <div class="sigint-watch-zones"></div>
    </div>
  `;

  document.body.appendChild(panel);
  bucket.push(() => panel.remove());

  const summaryHost = panel.querySelector('.sigint-watch-summary');
  const suggestionsHost = panel.querySelector('.sigint-watch-suggestions');
  const zonesHost = panel.querySelector('.sigint-watch-zones');
  const form = panel.querySelector('.sigint-watch-form');
  const copyBtn = panel.querySelector('[data-role="copy"]');
  const alertsBtn = panel.querySelector('[data-role="alerts"]');
  const closeBtn = panel.querySelector('[data-role="close"]');
  const clearFormBtn = panel.querySelector('[data-role="clear-form"]');

  let zones = loadZones();
  let open = readStoredFlag(PANEL_OPEN_STORAGE_KEY, false);
  let summary = { zones: zones.length, hot: 0, newHits: 0, armed: zones.filter((zone) => zone.armed).length };
  let snapshots = [];
  let lastIncidents = Array.isArray(context.getIncidents?.()) ? [...context.getIncidents()] : [];
  const runtime = new Map();

  const persistZones = () => saveZones(zones);
  let lastEmitSignature = '';

  const emitUpdate = () => {
    const detail = { summary, zones, snapshots };
    const nextSignature = stableSerialize({
      summary,
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        domain: zone.domain,
        armed: zone.armed,
        radiusKm: zone.radiusKm,
        minPriority: zone.minPriority,
        lat: zone.lat,
        lon: zone.lon,
      })),
      snapshots: snapshots.map((snapshot) => ({
        zoneId: snapshot.zone.id,
        activeCount: snapshot.activeCount,
        hot: snapshot.hot,
        escalated: snapshot.escalated,
        newHitIds: snapshot.newHits.map((incident) => incident.id),
        resolvedIds: snapshot.resolvedIds,
        topIncidentId: snapshot.topIncident?.id || '',
      })),
    });

    if (nextSignature === lastEmitSignature) return;
    lastEmitSignature = nextSignature;
    dispatchSigintEvent('sigint:watch-center-update', detail);
    context.onSummaryChange?.(summary);
  };

  const setPanelOpen = (nextOpen) => {
    open = !!nextOpen;
    panel.dataset.open = open ? 'true' : 'false';
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    writeStoredFlag(PANEL_OPEN_STORAGE_KEY, open);
    context.onSummaryChange?.(summary);
  };

  const sync = (options = {}, incidentList = lastIncidents) => {
    lastIncidents = Array.isArray(incidentList) ? [...incidentList] : [];

    const nextSnapshots = zones.map((zone) => {
      const previous = runtime.get(zone.id) || { hitIds: new Set(), topWeight: 0, lastAlertAt: 0 };
      const hits = lastIncidents.filter((incident) => incidentMatchesZone(incident, zone)).sort(compareIncidents);
      const hitIds = new Set(hits.map((incident) => incident.id));
      const newHits = hits.filter((incident) => !previous.hitIds.has(incident.id));
      const resolvedIds = Array.from(previous.hitIds).filter((incidentId) => !hitIds.has(incidentId));
      const topIncident = hits[0] || null;
      const topWeight = priorityWeight(topIncident?.priority);
      const escalated = topWeight > previous.topWeight;
      const shouldAlert = zone.armed
        && (newHits.length > 0 || escalated)
        && Date.now() - (previous.lastAlertAt || 0) > 60000;

      runtime.set(zone.id, {
        hitIds,
        topWeight,
        lastAlertAt: shouldAlert ? Date.now() : previous.lastAlertAt || 0,
      });

      return {
        zone,
        hits,
        hitIds,
        newHits,
        resolvedIds,
        activeCount: hits.length,
        topIncident,
        hot: topWeight >= priorityWeight('P1') || newHits.length > 0,
        escalated,
        shouldAlert: !options.silent && shouldAlert,
      };
    });

    snapshots = nextSnapshots.sort((left, right) => {
      return Number(right.hot) - Number(left.hot)
        || priorityWeight(right.topIncident?.priority) - priorityWeight(left.topIncident?.priority)
        || right.activeCount - left.activeCount
        || left.zone.name.localeCompare(right.zone.name);
    });

    summary = {
      zones: zones.length,
      hot: snapshots.filter((snapshot) => snapshot.hot && snapshot.activeCount > 0).length,
      newHits: snapshots.reduce((sum, snapshot) => sum + snapshot.newHits.length, 0),
      armed: zones.filter((zone) => zone.armed).length,
    };

    if (!options.silent) {
      snapshots.forEach((snapshot) => maybeNotify(snapshot, context));
    }

    render();
    emitUpdate();
  };

  const focusSnapshot = (snapshot) => {
    const api = getPublicApi();
    const focusLat = snapshot.topIncident?.lat ?? snapshot.zone.lat;
    const focusLon = snapshot.topIncident?.lon ?? snapshot.zone.lon;
    api.focusLocation?.(focusLat, focusLon, {
      title: snapshot.topIncident?.title ? `${snapshot.topIncident.title} • ${snapshot.zone.name}` : `Watch Zone • ${snapshot.zone.name}`,
      detail: buildZoneDetail(snapshot.zone, snapshot),
      domain: snapshot.topIncident?.dominantDomain || snapshot.zone.domain,
      status: snapshot.topIncident ? `${snapshot.topIncident.priority} / Confidence ${snapshot.topIncident.confidence}` : 'Watch zone',
      source: snapshot.topIncident?.sources?.join(', ') || 'Watch Center',
      url: snapshot.topIncident?.primaryUrl || '',
      lat: focusLat,
      lon: focusLon,
    });
  };

  const focusZone = (zoneId) => {
    const snapshot = snapshots.find((entry) => entry.zone.id === zoneId);
    if (snapshot) focusSnapshot(snapshot);
  };

  const copyZone = async (snapshot) => {
    try {
      await copyText(buildZoneDigest(snapshot));
      context.showToast?.(`Copied watch zone digest for ${snapshot.zone.name}.`, 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Watch zone digest copy failed:', error);
      context.showToast?.('Unable to copy the watch zone digest.', 'danger');
    }
  };

  const copyDigest = async () => {
    try {
      await copyText(buildDigest(snapshots, summary));
      context.showToast?.('Watch Center digest copied.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Watch Center digest copy failed:', error);
      context.showToast?.('Unable to copy the Watch Center digest.', 'danger');
    }
  };

  const requestNotificationPermission = async () => {
    if (!(window.Notification && Notification.permission === 'default')) return;
    try {
      await Notification.requestPermission();
    } catch {
      // ignore notification permission failures
    }
  };

  const addZone = (zone) => {
    const nextZone = sanitizeZone(zone);
    if (!nextZone) {
      context.showToast?.('Watch zone requires valid latitude and longitude.', 'warning');
      return null;
    }

    const duplicate = zones.find((existing) => haversineKm(existing.lat, existing.lon, nextZone.lat, nextZone.lon) < 10 && existing.domain === nextZone.domain);
    if (duplicate) {
      context.showToast?.(`Already tracking ${duplicate.name}.`, 'warning');
      return { ...duplicate, __existing: true };
    }

    zones = [nextZone, ...zones].slice(0, 16);
    persistZones();
    sync({ silent: true });
    return nextZone;
  };

  const addZoneFromIncident = (incident) => {
    const zone = buildZoneFromIncident(incident);
    if (!zone) {
      context.showToast?.('Unable to build a watch zone from that incident.', 'warning');
      return null;
    }

    const added = addZone(zone);
    if (!added) return null;
    if (!added.__existing) {
      context.showToast?.(`Tracking zone “${added.name}” (${added.radiusKm} km).`, 'success');
    }
    if (open) render();
    return added;
  };

  const toggleAllArmed = async () => {
    const nextArmed = !zones.every((zone) => zone.armed);
    zones = zones.map((zone) => ({ ...zone, armed: nextArmed, updatedAt: Date.now() }));
    persistZones();
    if (nextArmed) await requestNotificationPermission();
    context.showToast?.(nextArmed ? 'All watch zones armed.' : 'All watch zones disarmed.', nextArmed ? 'success' : 'warning');
    sync({ silent: true });
  };

  const clearZones = () => {
    zones = [];
    runtime.clear();
    persistZones();
    sync({ silent: true });
    context.showToast?.('Watch zones cleared.', 'warning');
  };

  const render = () => {
    if (!summaryHost || !zonesHost || !suggestionsHost || !open) return;

    const summaryCards = [
      { label: 'Tracked zones', value: summary.zones },
      { label: 'Hot zones', value: summary.hot },
      { label: 'New hits', value: summary.newHits },
      { label: 'Armed', value: summary.armed },
    ];

    setInnerHtmlIfChanged(summaryHost, `
      <div class="sigint-watch-summary-grid">
        ${summaryCards.map((card) => `
          <div class="sigint-watch-summary-card">
            <div class="sigint-watch-summary-card__label">${escapeHtml(card.label)}</div>
            <div class="sigint-watch-summary-card__value">${escapeHtml(card.value)}</div>
          </div>
        `).join('')}
      </div>
    `, summaryCards);

    const suggestions = lastIncidents
      .filter((incident) => !zones.some((zone) => haversineKm(zone.lat, zone.lon, Number(incident.lat) || 0, Number(incident.lon) || 0) < 10))
      .sort(compareIncidents)
      .slice(0, 4);

    setInnerHtmlIfChanged(suggestionsHost, `
      <div class="sigint-watch-zones-title">Quick track</div>
      <div class="sigint-watch-zones-subtitle">Promote live incidents into watch zones with one click.</div>
      <div class="sigint-watch-suggestions">
        ${suggestions.length ? suggestions.map((incident) => `
          <button type="button" class="sigint-watch-suggestion" data-incident-id="${escapeHtml(incident.id)}">
            <span class="sigint-watch-chip" data-tone="${incident.priority === 'P1' ? 'hot' : 'new'}">${escapeHtml(incident.priority)}</span>
            <span>
              <strong>${escapeHtml(incident.title)}</strong>
              <span class="sigint-watch-suggestion__meta">${escapeHtml(incident.sourceCount)} sources · ${escapeHtml(formatCoords(incident.lat, incident.lon))}</span>
            </span>
          </button>
        `).join('') : '<div class="sigint-watch-empty">No live incidents are outside existing watch zones right now.</div>'}
      </div>
    `, {
      suggestions: suggestions.map((incident) => ({
        id: incident.id,
        priority: incident.priority,
        title: incident.title,
        sourceCount: incident.sourceCount,
        lat: incident.lat,
        lon: incident.lon,
      })),
    });

    setTextContentIfChanged(alertsBtn, zones.every((zone) => zone.armed) && zones.length ? 'Disarm all' : 'Arm all');

    if (!snapshots.length) {
      setInnerHtmlIfChanged(
        zonesHost,
        '<div class="sigint-watch-empty">No watch zones configured yet. Use quick track or add a manual geo-fence above.</div>',
        'watch-empty',
      );
      return;
    }

    const zoneCards = snapshots.map((snapshot) => ({
      zoneId: snapshot.zone.id,
      name: snapshot.zone.name,
      radiusKm: snapshot.zone.radiusKm,
      domain: snapshot.zone.domain,
      minPriority: snapshot.zone.minPriority,
      lat: snapshot.zone.lat,
      lon: snapshot.zone.lon,
      armed: snapshot.zone.armed,
      activeCount: snapshot.activeCount,
      hot: snapshot.hot,
      newHits: snapshot.newHits.length,
      resolvedIds: snapshot.resolvedIds.length,
      topIncidentId: snapshot.topIncident?.id || '',
      topLabel: snapshot.topIncident ? `${snapshot.topIncident.priority} ${snapshot.topIncident.title}` : 'No active corroborated incidents',
      hits: snapshot.hits.slice(0, 3).map((incident) => ({
        id: incident.id,
        priority: incident.priority,
        title: incident.title,
        sources: incident.sources,
        freshnessLabel: incident.freshnessLabel || formatAge(incident.freshestTimestamp),
      })),
    }));

    setInnerHtmlIfChanged(zonesHost, `
      <div class="sigint-watch-zones-title" style="padding:12px 12px 0;">Tracked zones</div>
      ${zoneCards.map((card) => `
        <article class="sigint-watch-zone" data-zone-id="${escapeHtml(card.zoneId)}">
          <div class="sigint-watch-zone__top">
            <div>
              <div class="sigint-watch-zone__title">${escapeHtml(card.name)}</div>
              <div class="sigint-watch-zone__meta">${escapeHtml(card.radiusKm)} km · ${escapeHtml(domainLabel(card.domain))} · ${escapeHtml(card.minPriority)}+ · ${escapeHtml(formatCoords(card.lat, card.lon))}</div>
            </div>
            <div class="sigint-watch-actions">
              <span class="sigint-watch-chip" data-tone="${card.activeCount ? (card.hot ? 'hot' : 'new') : 'idle'}">${card.activeCount ? `${card.activeCount} active` : 'quiet'}</span>
              <span class="sigint-watch-chip" data-tone="${card.armed ? 'armed' : 'idle'}">${card.armed ? 'armed' : 'muted'}</span>
            </div>
          </div>
          <div class="sigint-watch-zone__summary">${escapeHtml(card.topLabel)} · ${escapeHtml(card.newHits)} new · ${escapeHtml(card.resolvedIds)} resolved</div>
          <div class="sigint-watch-hits">
            ${card.hits.length ? card.hits.map((incident) => `
              <div class="sigint-watch-hit">
                <div>
                  <div class="sigint-watch-hit__title">${escapeHtml(incident.priority)} · ${escapeHtml(incident.title)}</div>
                  <div class="sigint-watch-hit__meta">${escapeHtml(incident.sources.join(' • '))} · ${escapeHtml(incident.freshnessLabel)}</div>
                </div>
                <div class="sigint-watch-chip" data-tone="${incident.priority === 'P1' ? 'hot' : 'new'}">${escapeHtml(incident.priority)}</div>
              </div>
            `).join('') : '<div class="sigint-watch-empty">No corroborated incidents currently match this watch zone.</div>'}
          </div>
          <div class="sigint-watch-zone__actions">
            <button type="button" class="sigint-watch-btn" data-action="focus">Focus</button>
            <button type="button" class="sigint-watch-btn" data-action="filter">Filter</button>
            <button type="button" class="sigint-watch-btn" data-action="brief" ${card.topIncidentId ? '' : 'disabled'}>${card.topIncidentId ? 'Brief top' : 'No brief'}</button>
            <button type="button" class="sigint-watch-btn" data-action="copy">Copy</button>
            <button type="button" class="sigint-watch-btn" data-action="arm" data-active="${card.armed ? 'true' : 'false'}">${card.armed ? 'Armed' : 'Arm'}</button>
            <button type="button" class="sigint-watch-btn" data-action="remove">Remove</button>
          </div>
        </article>
      `).join('')}
    `, zoneCards);
  };
  const findSnapshot = (eventTarget) => {
    const zoneElement = eventTarget.closest('[data-zone-id]');
    if (!zoneElement) return null;
    return snapshots.find((snapshot) => snapshot.zone.id === zoneElement.dataset.zoneId) || null;
  };

  const onFormSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const added = addZone({
      name: formData.get('name'),
      lat: formData.get('lat'),
      lon: formData.get('lon'),
      radiusKm: formData.get('radius'),
      domain: formData.get('domain'),
      minPriority: formData.get('priority'),
      armed: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (!added) return;

    form.reset();
    if (!added.__existing) {
      context.showToast?.(`Watch zone “${added.name}” added.`, 'success');
    }
    if (open) render();
  };
  form.addEventListener('submit', onFormSubmit);

  const resetForm = () => form.reset();
  clearFormBtn.addEventListener('click', resetForm);

  const onSuggestionsClick = (event) => {
    const suggestion = event.target.closest('[data-incident-id]');
    if (!suggestion) return;
    const incident = lastIncidents.find((entry) => entry.id === suggestion.dataset.incidentId);
    if (incident) addZoneFromIncident(incident);
  };
  suggestionsHost.addEventListener('click', onSuggestionsClick);

  const onZonesClick = (event) => {
    const snapshot = findSnapshot(event.target);
    if (!snapshot) return;
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'focus') {
      focusSnapshot(snapshot);
      return;
    }

    if (action === 'filter') {
      const filter = snapshot.zone.domain !== 'all'
        ? snapshot.zone.domain
        : snapshot.topIncident?.dominantDomain || 'all';
      context.setFilter?.(filter === 'maritime' ? 'naval' : filter);
      return;
    }

    if (action === 'brief') {
      if (snapshot.topIncident) {
        context.addBriefItem?.(snapshot.topIncident);
      }
      return;
    }

    if (action === 'copy') {
      copyZone(snapshot);
      return;
    }

    if (action === 'arm') {
      zones = zones.map((zone) => zone.id === snapshot.zone.id ? { ...zone, armed: !zone.armed, updatedAt: Date.now() } : zone);
      persistZones();
      sync({ silent: true });
      return;
    }

    if (action === 'remove') {
      zones = zones.filter((zone) => zone.id !== snapshot.zone.id);
      runtime.delete(snapshot.zone.id);
      persistZones();
      sync({ silent: true });
      context.showToast?.(`Removed watch zone “${snapshot.zone.name}”.`, 'warning');
    }
  };
  zonesHost.addEventListener('click', onZonesClick);

  const onCopyClick = () => { copyDigest(); };
  const onAlertsClick = () => { toggleAllArmed(); };
  const onCloseClick = () => { setPanelOpen(false); };

  copyBtn.addEventListener('click', onCopyClick);
  alertsBtn.addEventListener('click', onAlertsClick);
  closeBtn.addEventListener('click', onCloseClick);

  const togglePanel = () => {
    setPanelOpen(!open);
    if (open) sync({ silent: true });
  };

  const onFusionUpdate = (event) => {
    const incidents = Array.isArray(event.detail?.incidents) ? event.detail.incidents : context.getIncidents?.() || [];
    sync({ silent: document.visibilityState === 'hidden' }, incidents);
  };

  window.addEventListener('sigint:fusion-updated', onFusionUpdate);
  bucket.push(() => window.removeEventListener('sigint:fusion-updated', onFusionUpdate));

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    sync({ silent: true });
  }, 20000);
  bucket.push(() => window.clearInterval(intervalId));

  bucket.push(() => form.removeEventListener('submit', onFormSubmit));
  bucket.push(() => clearFormBtn.removeEventListener('click', resetForm));
  bucket.push(() => suggestionsHost.removeEventListener('click', onSuggestionsClick));
  bucket.push(() => zonesHost.removeEventListener('click', onZonesClick));
  bucket.push(() => copyBtn.removeEventListener('click', onCopyClick));
  bucket.push(() => alertsBtn.removeEventListener('click', onAlertsClick));
  bucket.push(() => closeBtn.removeEventListener('click', onCloseClick));

  sync({ silent: true });
  setPanelOpen(open);

  window.__SIGINT_MAP_WATCH_CENTER__ = {
    toggle: togglePanel,
    open: () => setPanelOpen(true),
    close: () => setPanelOpen(false),
    isOpen: () => open,
    getSummary: () => summary,
    getZones: () => zones,
    getSnapshots: () => snapshots,
    addZoneFromIncident,
    focusZone,
    copyDigest: () => copyDigest(),
    clearZones,
    render: () => sync({ silent: true }),
  };
  bucket.push(() => { delete window.__SIGINT_MAP_WATCH_CENTER__; });

  return {
    toggle: togglePanel,
    open: () => setPanelOpen(true),
    close: () => setPanelOpen(false),
    isOpen: () => open,
    getSummary: () => summary,
    getZones: () => zones,
    getSnapshots: () => snapshots,
    addZoneFromIncident,
    focusZone,
    copyDigest: () => copyDigest(),
    clearZones,
    render: () => sync({ silent: true }),
  };
}
