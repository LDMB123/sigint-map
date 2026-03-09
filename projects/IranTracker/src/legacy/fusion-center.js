import {
  copyText,
  dispatchSigintEvent,
  escapeHtml,
  formatAge,
  formatCoords,
  haversineKm,
  getSigintPublicApi as getPublicApi,
  getSigintSourceHealth,
  readStoredFlag,
  readStoredJson,
  setInnerHtmlIfChanged,
  stableSerialize,
  writeStoredFlag,
  writeStoredJson,
} from './shared-utils.js';


const WATCHLIST_STORAGE_KEY = 'sigint-map:fusion-watchlist:v1';
const PANEL_OPEN_STORAGE_KEY = 'sigint-map:fusion-open:v1';

const DOMAIN_WEIGHTS = {
  impact: 10,
  intercept: 8,
  seismic: 7,
  thermal: 8,
  conflict: 6,
  gdelt: 6,
  maritime: 6,
  naval: 4,
  weather: 2,
  radiation: 4,
  sigmet: 5,
  air: 3,
  unknown: 2,
};

const HEALTH_KEY_BY_DOMAIN = {
  seismic: 'usgs',
  thermal: 'firms',
  conflict: 'gdelt',
  gdelt: 'gdelt',
  maritime: 'maritime',
  weather: 'weather',
  radiation: 'openradiation',
  sigmet: 'sigmet',
  air: 'opensky',
};

function normalizeDomain(marker) {
  if (marker.isMaritime) return 'maritime';
  if (marker.isWeather) return 'weather';
  if (marker.isRadiation) return 'radiation';
  if (marker.isConflict) return 'conflict';
  const domain = String(marker.domain || marker.filterType || 'unknown').toLowerCase();
  if (domain === 'gdelt') return 'conflict';
  return domain;
}

function inferHealthKey(marker) {
  const source = String(marker.source || '').toLowerCase();
  if (source.includes('usgs')) return 'usgs';
  if (source.includes('firms')) return 'firms';
  if (source.includes('gdelt')) return 'gdelt';
  if (source.includes('open-meteo')) return 'weather';
  if (source.includes('openradiation')) return 'openradiation';
  if (source.includes('safecast')) return 'safecast';
  if (source.includes('adsb.lol')) return 'adsb_lol';
  if (source.includes('opensky')) return 'opensky';
  if (source.includes('aviation')) return 'sigmet';
  if (source.includes('digitraffic') || source.includes('ais')) return 'maritime';
  return HEALTH_KEY_BY_DOMAIN[normalizeDomain(marker)] || null;
}

function includeMarker(marker) {
  if (!marker || !marker.title) return false;
  const domain = normalizeDomain(marker);
  const source = String(marker.source || '').trim().toLowerCase();
  if (source === 'public osint' && ['air', 'land', 'naval'].includes(domain) && !marker.isMaritime) {
    return false;
  }
  return true;
}

function markerWeight(marker) {
  const domain = normalizeDomain(marker);
  let weight = DOMAIN_WEIGHTS[domain] || DOMAIN_WEIGHTS.unknown;
  const combined = `${marker.title || ''} ${marker.status || ''} ${marker.detail || ''}`.toLowerCase();
  if (/critical|impact|intercept|high confidence|emergency|warning/.test(combined)) weight += 3;
  if (/m\d(\.\d)?/.test(combined)) weight += 2;
  if (marker.visible === false) weight -= 1;
  return weight;
}

function clusterRadiusKm(marker) {
  const domain = normalizeDomain(marker);
  if (domain === 'conflict') return 260;
  if (domain === 'weather') return 320;
  return 180;
}

function getMarkers() {
  const api = getPublicApi();
  if (typeof api.getMarkers !== 'function') return [];
  try {
    const markers = api.getMarkers();
    return Array.isArray(markers) ? markers.filter(includeMarker) : [];
  } catch (error) {
    console.error('[SIGINT-MAP] Fusion center could not read markers:', error);
    return [];
  }
}

function buildClusterId(cluster) {
  const domainKey = Array.from(cluster.domains).sort().join('+');
  const latKey = Math.round(cluster.lat * 2) / 2;
  const lonKey = Math.round(cluster.lon * 2) / 2;
  return `${latKey}:${lonKey}:${domainKey}`;
}

function clusterMarkers(markers) {
  const clusters = [];
  markers.forEach((marker) => {
    const radius = clusterRadiusKm(marker);
    let target = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    clusters.forEach((cluster) => {
      const distance = haversineKm(marker.lat, marker.lon, cluster.lat, cluster.lon);
      if (distance <= Math.max(radius, cluster.radiusKm) && distance < bestDistance) {
        target = cluster;
        bestDistance = distance;
      }
    });
    if (!target) {
      target = { lat: marker.lat, lon: marker.lon, radiusKm: radius, markers: [], domains: new Set(), sources: new Set(), healthKeys: new Set() };
      clusters.push(target);
    }
    target.markers.push(marker);
    target.lat = target.markers.reduce((sum, item) => sum + item.lat, 0) / target.markers.length;
    target.lon = target.markers.reduce((sum, item) => sum + item.lon, 0) / target.markers.length;
    target.radiusKm = Math.max(target.radiusKm, radius);
    target.domains.add(normalizeDomain(marker));
    target.sources.add(String(marker.source || marker.domain || 'unknown'));
    const healthKey = inferHealthKey(marker);
    if (healthKey) target.healthKeys.add(healthKey);
  });
  return clusters;
}

function describeIncident(incident) {
  const titles = incident.markers
    .sort((a, b) => markerWeight(b) - markerWeight(a))
    .map((marker) => String(marker.title || '').replace(/^[^\w]+/u, '').trim())
    .filter(Boolean);

  if (!titles.length) return 'No corroborated detail available.';
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} • ${titles[1]}`;
  return `${titles[0]} • ${titles[1]} +${titles.length - 2} more`;
}

function buildIncidents(markers, sourceHealth = {}) {
  return clusterMarkers(markers)
    .map((cluster) => {
      const markersByWeight = [...cluster.markers].sort((a, b) => markerWeight(b) - markerWeight(a));
      const topMarker = markersByWeight[0] || {};
      const domains = Array.from(cluster.domains);
      const sourceList = Array.from(cluster.sources);
      const score = markersByWeight.reduce((sum, marker) => sum + markerWeight(marker), 0) + Math.max(0, sourceList.length - 1) * 5 + Math.max(0, domains.length - 1) * 7;
      const confidence = Math.max(42, Math.min(99, 42 + Math.min(markersByWeight.length, 6) * 5 + Math.max(0, sourceList.length - 1) * 9 + Math.max(0, domains.length - 1) * 8));
      const healthEntries = Array.from(cluster.healthKeys).map((key) => sourceHealth[key]).filter(Boolean);
      const freshestTimestamp = healthEntries.reduce((latest, entry) => {
        const candidate = entry.lastFetchedAt || entry.updatedAt || 0;
        return candidate > latest ? candidate : latest;
      }, 0);
      const priority = score >= 28 ? 'P1' : score >= 18 ? 'P2' : 'P3';
      return {
        id: buildClusterId(cluster),
        lat: cluster.lat,
        lon: cluster.lon,
        markers: cluster.markers,
        sourceCount: sourceList.length,
        sources: sourceList,
        domains,
        dominantDomain: normalizeDomain(topMarker),
        title: String(topMarker.title || 'Corroborated activity').replace(/^[^\w]+/u, '').trim() || 'Corroborated activity',
        summary: describeIncident(cluster),
        score,
        confidence,
        priority,
        freshnessLabel: freshestTimestamp ? formatAge(freshestTimestamp) : '—',
        freshestTimestamp,
        primaryUrl: topMarker.url || '',
      };
    })
    .filter((incident) => incident.markers.length > 0)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || b.markers.length - a.markers.length)
    .slice(0, 8);
}

function buildIncidentDetail(incident) {
  const lines = [
    `Priority: ${incident.priority} | Confidence: ${incident.confidence}`,
    `Sources: ${incident.sources.join(', ')}`,
    `Domains: ${incident.domains.join(', ')}`,
    `Coordinates: ${formatCoords(incident.lat, incident.lon)}`,
    '',
  ];
  incident.markers.slice(0, 5).forEach((marker) => lines.push(`• ${String(marker.title || '').replace(/\s+/g, ' ').trim()}`));
  return lines.join('\n');
}

function injectStyles() {
  if (document.getElementById('sigint-fusion-styles')) return;
  const style = document.createElement('style');
  style.id = 'sigint-fusion-styles';
  style.textContent = `
    .sigint-fusion-panel{position:fixed;z-index:10004;top:86px;right:16px;width:min(420px,calc(100vw - 24px));max-height:min(72vh,780px);display:flex;flex-direction:column;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(7,11,18,0.92);box-shadow:0 24px 60px rgba(0,0,0,0.4);backdrop-filter:blur(16px);transform:translateY(-8px);opacity:0;pointer-events:none;transition:opacity 160ms ease,transform 160ms ease}
    .sigint-fusion-panel[data-open="true"]{opacity:1;transform:translateY(0);pointer-events:auto}
    [data-theme="light"] .sigint-fusion-panel{background:rgba(244,247,252,0.96);border-color:rgba(0,0,0,0.08)}
    .sigint-fusion-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.06)}
    [data-theme="light"] .sigint-fusion-header{border-bottom-color:rgba(0,0,0,0.08)}
    .sigint-fusion-title{font-family:var(--font-display);font-size:15px;letter-spacing:.02em}
    .sigint-fusion-meta{margin-top:4px;font-family:var(--font-mono);font-size:10px;line-height:1.5;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.08em}
    .sigint-fusion-actions,.sigint-fusion-card__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .sigint-fusion-btn{min-height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:var(--color-text);cursor:pointer;font:inherit;font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
    .sigint-fusion-btn:hover,.sigint-fusion-btn:focus-visible{background:rgba(0,212,255,0.1);border-color:rgba(0,212,255,0.25);outline:none}
    .sigint-fusion-btn[data-active="true"]{background:rgba(34,197,94,0.14);border-color:rgba(34,197,94,0.22);color:#86efac}
    .sigint-fusion-body{overflow:auto;padding:12px 14px 16px;display:flex;flex-direction:column;gap:12px}
    .sigint-fusion-empty{padding:18px;border-radius:14px;border:1px dashed rgba(255,255,255,0.12);color:var(--color-text-muted);font-family:var(--font-mono);font-size:11px;line-height:1.6}
    .sigint-fusion-card{border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;background:rgba(255,255,255,0.02);display:grid;gap:10px}
    [data-theme="light"] .sigint-fusion-card{border-color:rgba(0,0,0,0.08);background:rgba(255,255,255,0.68)}
    .sigint-fusion-card__top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .sigint-fusion-card__title{font-size:13px;font-weight:600;line-height:1.4}
    .sigint-fusion-card__meta{margin-top:4px;color:var(--color-text-muted);font-family:var(--font-mono);font-size:10px;line-height:1.5;text-transform:uppercase;letter-spacing:.08em}
    .sigint-fusion-card__summary{color:var(--color-text);font-size:12px;line-height:1.55}
    .sigint-fusion-badges{display:flex;gap:6px;flex-wrap:wrap}
    .sigint-fusion-badge{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,0.06);color:var(--color-text);font-family:var(--font-mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase}
    .sigint-fusion-badge[data-priority="P1"]{background:rgba(239,68,68,0.14);color:#fca5a5}
    .sigint-fusion-badge[data-priority="P2"]{background:rgba(245,158,11,0.14);color:#fdba74}
    .sigint-fusion-badge[data-priority="P3"]{background:rgba(34,197,94,0.14);color:#86efac}
    .sigint-fusion-watch{width:32px;min-width:32px;height:32px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:var(--color-text-muted);cursor:pointer;font-size:16px;line-height:1}
    .sigint-fusion-watch[data-active="true"]{color:#fbbf24;border-color:rgba(251,191,36,0.35);background:rgba(251,191,36,0.08)}
    .sigint-fusion-sources{color:var(--color-text-muted);font-size:11px;line-height:1.5}
    body[data-op-mode="kiosk"] .sigint-fusion-panel{top:16px;right:16px;width:min(460px,calc(100vw - 32px))}
    @media (max-width:900px){.sigint-fusion-panel{left:12px;right:12px;width:auto;top:72px}}
  `;
  document.head.appendChild(style);
}

export function createFusionCenter(bucket, context) {
  injectStyles();
  const panel = document.createElement('section');
  panel.className = 'sigint-fusion-panel';
  panel.dataset.open = 'false';
  panel.setAttribute('aria-label', 'Fusion center');
  panel.innerHTML = `
    <div class="sigint-fusion-header">
      <div>
        <div class="sigint-fusion-title">Fusion Center</div>
        <div class="sigint-fusion-meta">Correlated incidents ranked by corroboration, severity, and feed freshness.</div>
      </div>
      <div class="sigint-fusion-actions">
        <button type="button" class="sigint-fusion-btn" data-role="copy">Copy digest</button>
        <button type="button" class="sigint-fusion-btn" data-role="close">Close</button>
      </div>
    </div>
    <div class="sigint-fusion-body"></div>
  `;
  document.body.appendChild(panel);
  bucket.push(() => panel.remove());

  const body = panel.querySelector('.sigint-fusion-body');
  const copyBtn = panel.querySelector('[data-role="copy"]');
  const closeBtn = panel.querySelector('[data-role="close"]');
  let incidents = [];
  let open = false;
  let summary = { total: 0, watchlisted: 0 };
  let previousScores = new Map();
  let watchlist = new Set(readStoredJson(WATCHLIST_STORAGE_KEY, []));

  const updateWatchlistStorage = () => writeStoredJson(WATCHLIST_STORAGE_KEY, Array.from(watchlist));
  const buildDigest = (subset = incidents.slice(0, 5)) => subset.length ? ['Fusion Center Digest', ...subset.map((incident, index) => `${index + 1}. ${incident.priority} | ${incident.title} | Confidence ${incident.confidence} | ${incident.sources.join(', ')} | ${formatCoords(incident.lat, incident.lon)}`)].join('\n') : 'Fusion Center: no corroborated incidents available.';
  const updateToolbar = () => context.onSummaryChange?.(summary);

  let lastEmitSignature = '';

  const emitFusionUpdate = () => {
    const detail = { incidents, summary };
    const nextSignature = stableSerialize({
      summary,
      incidents: incidents.map((incident) => ({
        id: incident.id,
        priority: incident.priority,
        score: incident.score,
        confidence: incident.confidence,
        freshness: incident.freshestTimestamp || incident.freshnessLabel,
        sourceCount: incident.sourceCount,
      })),
    });

    if (nextSignature === lastEmitSignature) return;
    lastEmitSignature = nextSignature;
    dispatchSigintEvent('sigint:fusion-updated', detail);
  };

  const render = () => {
    if (!body || !open) return;
    if (!incidents.length) {
      setInnerHtmlIfChanged(
        body,
        '<div class="sigint-fusion-empty">The fusion engine is waiting for enough live markers to form corroborated incidents. Once thermal, seismic, conflict, weather, or maritime signals overlap, ranked clusters will appear here.</div>',
        'fusion-empty',
      );
      return;
    }

    const cards = incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      sourceCount: incident.sourceCount,
      domains: incident.domains,
      lat: incident.lat,
      lon: incident.lon,
      watched: watchlist.has(incident.id),
      briefed: context.isBriefed?.(incident.id) || false,
      priority: incident.priority,
      confidence: incident.confidence,
      freshnessLabel: incident.freshnessLabel,
      summary: incident.summary,
      sources: incident.sources,
    }));

    setInnerHtmlIfChanged(body, cards.map((card) => `
      <article class="sigint-fusion-card" data-incident-id="${escapeHtml(card.id)}">
        <div class="sigint-fusion-card__top">
          <div>
            <div class="sigint-fusion-card__title">${escapeHtml(card.title)}</div>
            <div class="sigint-fusion-card__meta">${escapeHtml(card.sourceCount)} sources · ${escapeHtml(card.domains.join(' + '))} · ${escapeHtml(formatCoords(card.lat, card.lon))}</div>
          </div>
          <button type="button" class="sigint-fusion-watch" data-action="watch" data-active="${card.watched ? 'true' : 'false'}">${card.watched ? '★' : '☆'}</button>
        </div>
        <div class="sigint-fusion-badges">
          <span class="sigint-fusion-badge" data-priority="${escapeHtml(card.priority)}">${escapeHtml(card.priority)}</span>
          <span class="sigint-fusion-badge">Confidence ${escapeHtml(card.confidence)}</span>
          <span class="sigint-fusion-badge">Fresh ${escapeHtml(card.freshnessLabel)}</span>
          ${card.briefed ? '<span class="sigint-fusion-badge">Briefed</span>' : ''}
        </div>
        <div class="sigint-fusion-card__summary">${escapeHtml(card.summary)}</div>
        <div class="sigint-fusion-sources">${escapeHtml(card.sources.join(' • '))}</div>
        <div class="sigint-fusion-card__actions">
          <button type="button" class="sigint-fusion-btn" data-action="focus">Focus</button>
          <button type="button" class="sigint-fusion-btn" data-action="filter">Filter</button>
          <button type="button" class="sigint-fusion-btn" data-action="zone">Track zone</button>
          <button type="button" class="sigint-fusion-btn" data-action="brief" ${card.briefed ? 'data-active="true"' : ''}>${card.briefed ? 'Briefed' : 'Add brief'}</button>
          <button type="button" class="sigint-fusion-btn" data-action="copy">Copy brief</button>
        </div>
      </article>
    `).join(''), cards);
  };

  const syncIncidents = (options = {}) => {
    const markers = getMarkers();
    const sourceHealth = getSigintSourceHealth();
    incidents = buildIncidents(markers, sourceHealth);
    summary = { total: incidents.length, watchlisted: incidents.filter((incident) => watchlist.has(incident.id)).length };
    incidents.forEach((incident) => {
      const previousScore = previousScores.get(incident.id);
      if (watchlist.has(incident.id) && previousScore != null && incident.score - previousScore >= 6 && !options.silent) {
        context.showToast?.(`Watchlist spike: ${incident.title} climbed to ${incident.priority}.`, 'warning');
      }
      previousScores.set(incident.id, incident.score);
    });
    render();
    updateToolbar();
    emitFusionUpdate();
  };

  const copyDigest = async (incident = null) => {
    const text = incident ? [`Fusion Incident Brief — ${incident.title}`, `Priority: ${incident.priority}`, `Confidence: ${incident.confidence}`, `Coordinates: ${formatCoords(incident.lat, incident.lon)}`, `Sources: ${incident.sources.join(', ')}`, `Summary: ${incident.summary}`].join('\n') : buildDigest();
    try {
      await copyText(text);
      context.showToast?.(incident ? 'Fusion incident brief copied.' : 'Fusion digest copied.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Fusion digest copy failed:', error);
      context.showToast?.('Unable to copy fusion digest.', 'danger');
    }
  };

  const findIncident = (eventTarget) => {
    const card = eventTarget.closest('[data-incident-id]');
    if (!card) return null;
    return incidents.find((incident) => incident.id === card.dataset.incidentId) || null;
  };

  const openPanel = () => { open = true; panel.dataset.open = 'true'; writeStoredFlag(PANEL_OPEN_STORAGE_KEY, true); syncIncidents({ silent: true }); updateToolbar(); };
  const closePanel = () => { open = false; panel.dataset.open = 'false'; writeStoredFlag(PANEL_OPEN_STORAGE_KEY, false); updateToolbar(); };
  const togglePanel = () => { if (open) closePanel(); else openPanel(); };

  body.addEventListener('click', (event) => {
    const incident = findIncident(event.target);
    if (!incident) return;
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'watch') {
      if (watchlist.has(incident.id)) {
        watchlist.delete(incident.id);
        context.showToast?.(`Removed ${incident.title} from the watchlist.`, 'warning');
      } else {
        watchlist.add(incident.id);
        context.showToast?.(`Added ${incident.title} to the watchlist.`, 'success');
      }
      updateWatchlistStorage();
      render();
      updateToolbar();
      emitFusionUpdate();
      return;
    }
    if (action === 'focus') {
      const api = getPublicApi();
      api.focusLocation?.(incident.lat, incident.lon, { title: incident.title, detail: buildIncidentDetail(incident), domain: 'fusion', status: `${incident.priority} / Confidence ${incident.confidence}`, source: incident.sources.join(', '), url: incident.primaryUrl || '', lat: incident.lat, lon: incident.lon });
      return;
    }
    if (action === 'filter') {
      const nextFilter = incident.dominantDomain === 'maritime' ? 'naval' : incident.dominantDomain;
      context.setFilter?.(nextFilter);
      return;
    }
    if (action === 'zone') {
      context.addWatchZone?.(incident);
      return;
    }
    if (action === 'brief') {
      context.addBriefItem?.(incident);
      render();
      return;
    }
    if (action === 'copy') copyDigest(incident);
  });

  copyBtn.addEventListener('click', () => copyDigest());
  closeBtn.addEventListener('click', closePanel);

  const onHealth = () => {
    if (document.visibilityState === 'hidden') return;
    syncIncidents({ silent: true });
  };
  const onWorkbenchUpdate = () => render();
  window.addEventListener('sigint:source-health', onHealth);
  window.addEventListener('sigint:ops-workbench-update', onWorkbenchUpdate);
  bucket.push(() => window.removeEventListener('sigint:source-health', onHealth));
  bucket.push(() => window.removeEventListener('sigint:ops-workbench-update', onWorkbenchUpdate));

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    syncIncidents({ silent: true });
  }, 15000);
  bucket.push(() => window.clearInterval(intervalId));

  syncIncidents({ silent: true });
  if (readStoredFlag(PANEL_OPEN_STORAGE_KEY, false)) openPanel();

  window.__SIGINT_MAP_FUSION_CENTER__ = { isOpen: () => open, getSummary: () => summary, getIncidents: () => incidents, render };
  bucket.push(() => { delete window.__SIGINT_MAP_FUSION_CENTER__; });

  return {
    toggle: togglePanel,
    open: openPanel,
    close: closePanel,
    render: () => syncIncidents({ silent: true }),
    isOpen: () => open,
    copyDigest: () => copyDigest(),
    getSummary: () => summary,
    getIncidents: () => incidents,
  };
}
