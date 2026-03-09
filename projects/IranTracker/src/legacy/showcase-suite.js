import { copyText, downloadTextFile, escapeHtml, formatCoords, getSigintSourceHealth, readStoredFlag, safeHref, writeStoredFlag } from './shared-utils.js';

const FOUNDER_MODE_STORAGE_KEY = 'sigint-map:founder-mode:v1';

function buildFileStem() {
  const date = new Date();
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ];
  return `sigint-map-${parts.join('')}`;
}

function wrapLines(text, maxChars = 58) {
  const safeText = String(text || '').trim();
  if (!safeText) return ['—'];
  const words = safeText.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines.length ? lines : ['—'];
}

function createTspans(lines, x, startY, lineHeight) {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${startY + (index * lineHeight)}">${escapeHtml(line)}</tspan>`)
    .join('');
}

function summarizePayload(context) {
  const sourceHealthEntries = Object.values(getSigintSourceHealth());
  const degradedSources = sourceHealthEntries.filter((entry) => entry?.status === 'error' || entry?.pending > 0);
  return {
    pulse: context.executiveDeck?.getSummary?.() || { score: 0, tone: 'steady', toneLabel: 'Steady' },
    incidents: Array.isArray(context.fusionCenter?.getIncidents?.()) ? context.fusionCenter.getIncidents() : [],
    snapshots: Array.isArray(context.watchCenter?.getSnapshots?.()) ? context.watchCenter.getSnapshots() : [],
    watchSummary: context.watchCenter?.getSummary?.() || { zones: 0, hot: 0, newHits: 0, armed: 0 },
    workbenchSummary: context.opsWorkbench?.getSummary?.() || { briefed: 0, new: 0, escalated: 0, resolved: 0, collectionGaps: 0 },
    briefItems: Array.isArray(context.opsWorkbench?.getBriefItems?.()) ? context.opsWorkbench.getBriefItems() : [],
    shareUrl: context.getShareUrl?.() || window.location.href,
    degradedSources,
  };
}

function buildCaption(payload) {
  const lead = payload.incidents[0] || payload.snapshots[0]?.topIncident || null;
  const lines = [
    `SIGINT-MAP pulse ${payload.pulse.score || 0} / ${payload.pulse.toneLabel || 'Steady'}.`,
    lead
      ? `Lead signal: ${lead.priority || 'P3'} ${lead.title} · confidence ${lead.confidence || 0} · ${lead.sourceCount || lead.sources?.length || 0} sources · ${formatCoords(lead.lat, lead.lon)}.`
      : 'Lead signal: waiting for corroborated incidents to rise above the noise.',
    `Watch picture: ${payload.watchSummary.hot || 0} hot zones · ${payload.watchSummary.newHits || 0} new hits · ${payload.watchSummary.zones || 0} total zones.`,
    `Briefing delta: ${payload.workbenchSummary.new || 0} new · ${payload.workbenchSummary.escalated || 0} escalated · ${payload.workbenchSummary.resolved || 0} resolved.`,
    payload.degradedSources.length
      ? `Collection note: ${payload.degradedSources.length} feed${payload.degradedSources.length === 1 ? '' : 's'} degraded and flagged for attention.`
      : 'Collection note: feeds healthy and synchronized.',
    payload.shareUrl ? `Live view: ${payload.shareUrl}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

function buildPosterSvg(payload) {
  const leadIncidents = payload.incidents.slice(0, 4);
  const watchSnapshots = payload.snapshots.slice(0, 3);
  const briefItems = payload.briefItems.slice(0, 3);
  const score = escapeHtml(payload.pulse.score || 0);
  const toneLabel = escapeHtml(payload.pulse.toneLabel || 'Steady');
  const gradientId = `sigintPosterGradient-${Date.now()}`;

  const incidentBlocks = leadIncidents.length
    ? leadIncidents.map((incident, index) => {
      const y = 256 + (index * 128);
      const titleLines = wrapLines(incident.title, 30).slice(0, 2);
      const summaryLines = wrapLines(incident.summary || 'Corroborated activity elevated in the live picture.', 40).slice(0, 3);
      return `
        <rect x="76" y="${y}" width="676" height="108" rx="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
        <text x="102" y="${y + 28}" fill="#99F6E4" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" font-weight="700">${escapeHtml(incident.priority || 'P3')} · ${escapeHtml(incident.sourceCount || incident.sources?.length || 0)} SOURCES · CONF ${escapeHtml(incident.confidence || 0)}</text>
        <text fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="24" font-weight="700">${createTspans(titleLines, 102, y + 60, 28)}</text>
        <text fill="#CBD5E1" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16">${createTspans(summaryLines, 102, y + 88, 22)}</text>
      `;
    }).join('')
    : `
      <rect x="76" y="256" width="676" height="180" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <text x="102" y="320" fill="#E2E8F0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="28" font-weight="700">Awaiting corroborated incidents</text>
      <text fill="#94A3B8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="18">${createTspans(['The poster will populate automatically as fusion elevates live signals.'], 102, 358, 24)}</text>
    `;

  const watchBlocks = watchSnapshots.length
    ? watchSnapshots.map((snapshot, index) => {
      const y = 266 + (index * 120);
      const title = wrapLines(snapshot.zone?.name || 'Watch zone', 20).slice(0, 2);
      const detail = `${snapshot.activeCount || 0} active · ${snapshot.newHits?.length || 0} new · ${snapshot.resolvedIds?.length || 0} resolved`;
      return `
        <rect x="850" y="${y}" width="674" height="92" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
        <text fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="700">${createTspans(title, 878, y + 38, 26)}</text>
        <text x="878" y="${y + 68}" fill="#93C5FD" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="15">${escapeHtml(detail)}</text>
      `;
    }).join('')
    : `
      <rect x="850" y="266" width="674" height="110" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />
      <text x="878" y="314" fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="700">No watch zones armed yet</text>
      <text x="878" y="346" fill="#94A3B8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16">Track a fused incident to turn this into a persistent regional monitor.</text>
    `;

  const briefBlocks = briefItems.length
    ? briefItems.map((item, index) => {
      const y = 660 + (index * 66);
      const title = wrapLines(item.title || 'Brief item', 42).slice(0, 2);
      return `
        <text fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="18" font-weight="600">${createTspans([`${index + 1}. ${title[0] || ''}`].concat(title.slice(1)), 878, y, 22)}</text>
      `;
    }).join('')
    : `<text x="878" y="690" fill="#94A3B8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="16">No curated briefing items captured yet.</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="SIGINT-MAP showcase poster">
  <defs>
    <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111C" />
      <stop offset="50%" stop-color="#081825" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <radialGradient id="glowA" cx="20%" cy="18%" r="40%">
      <stop offset="0%" stop-color="rgba(0,212,255,0.28)" />
      <stop offset="100%" stop-color="rgba(0,212,255,0)" />
    </radialGradient>
    <radialGradient id="glowB" cx="80%" cy="20%" r="34%">
      <stop offset="0%" stop-color="rgba(99,102,241,0.24)" />
      <stop offset="100%" stop-color="rgba(99,102,241,0)" />
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#${gradientId})" />
  <rect width="1600" height="900" fill="url(#glowA)" />
  <rect width="1600" height="900" fill="url(#glowB)" />
  <text x="76" y="88" fill="#7DD3FC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="18" font-weight="700" letter-spacing="4">SIGINT-MAP · SHOWCASE POSTER</text>
  <text x="76" y="154" fill="#F8FAFC" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="64" font-weight="800">Pulse ${score}</text>
  <text x="364" y="154" fill="#CBD5E1" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="34" font-weight="600">${toneLabel}</text>
  <text fill="#94A3B8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="20">${createTspans(wrapLines(buildCaption(payload).split('\n').slice(0, 2).join(' '), 82).slice(0, 2), 76, 194, 26)}</text>
  <rect x="76" y="230" width="676" height="592" rx="28" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
  <text x="102" y="272" fill="#E2E8F0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="700">Lead incidents</text>
  ${incidentBlocks}
  <rect x="850" y="230" width="674" height="320" rx="28" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
  <text x="878" y="272" fill="#E2E8F0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="700">Regional watch picture</text>
  ${watchBlocks}
  <rect x="850" y="576" width="674" height="246" rx="28" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" />
  <text x="878" y="620" fill="#E2E8F0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" font-weight="700">Briefing board</text>
  <text x="878" y="650" fill="#93C5FD" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="15">${escapeHtml(payload.workbenchSummary.briefed || 0)} briefed · ${escapeHtml(payload.workbenchSummary.new || 0)} new · ${escapeHtml(payload.workbenchSummary.escalated || 0)} escalated</text>
  ${briefBlocks}
  <text x="76" y="860" fill="#64748B" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14">${escapeHtml(payload.shareUrl)}</text>
</svg>`;
}

function buildSnapshotCardHtml(payload) {
  const leadIncidents = payload.incidents.slice(0, 5);
  const watchSnapshots = payload.snapshots.slice(0, 4);
  const briefItems = payload.briefItems.slice(0, 5);
  const caption = escapeHtml(buildCaption(payload)).replace(/\n/g, '<br />');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SIGINT-MAP Snapshot Card</title>
  <style>
    :root {
      color-scheme: dark;
      --bg:#07111c;
      --panel:rgba(255,255,255,0.05);
      --stroke:rgba(255,255,255,0.12);
      --text:#f8fafc;
      --muted:#94a3b8;
      --accent:#00d4ff;
      --accent2:#6366f1;
    }
    * { box-sizing:border-box; }
    body {
      margin:0;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background:
        radial-gradient(circle at top left, rgba(0,212,255,0.16), transparent 40%),
        radial-gradient(circle at top right, rgba(99,102,241,0.16), transparent 36%),
        var(--bg);
      color:var(--text);
      padding:32px;
    }
    .shell {
      max-width:1180px;
      margin:0 auto;
      display:grid;
      gap:20px;
    }
    .hero, .panel {
      border:1px solid var(--stroke);
      border-radius:24px;
      background:var(--panel);
      backdrop-filter:blur(14px);
      box-shadow:0 20px 60px rgba(0,0,0,0.28);
    }
    .hero { padding:28px; }
    .eyebrow {
      font-size:12px;
      letter-spacing:.18em;
      text-transform:uppercase;
      color:#7dd3fc;
      font-weight:700;
    }
    .headline {
      margin-top:14px;
      display:flex;
      align-items:flex-end;
      gap:16px;
      flex-wrap:wrap;
    }
    .pulse {
      font-size:58px;
      line-height:1;
      font-weight:800;
      letter-spacing:-0.04em;
    }
    .tone {
      display:inline-flex;
      align-items:center;
      min-height:32px;
      padding:0 14px;
      border-radius:999px;
      border:1px solid rgba(0,212,255,0.22);
      background:rgba(0,212,255,0.12);
      color:#dff8ff;
      font-size:13px;
      text-transform:uppercase;
      letter-spacing:.12em;
      font-weight:700;
    }
    .caption {
      margin-top:16px;
      color:var(--muted);
      font-size:15px;
      line-height:1.7;
      max-width:980px;
    }
    .meta-grid {
      margin-top:20px;
      display:grid;
      grid-template-columns:repeat(4, minmax(0, 1fr));
      gap:12px;
    }
    .stat {
      padding:14px 16px;
      border:1px solid var(--stroke);
      border-radius:18px;
      background:rgba(255,255,255,0.04);
    }
    .stat-label {
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:.14em;
      color:var(--muted);
    }
    .stat-value {
      margin-top:10px;
      font-size:28px;
      font-weight:800;
    }
    .grid {
      display:grid;
      grid-template-columns:1.2fr .9fr;
      gap:20px;
    }
    .panel { padding:22px; }
    .panel-title {
      font-size:22px;
      font-weight:800;
      letter-spacing:-0.02em;
    }
    .panel-subtitle {
      margin-top:6px;
      color:var(--muted);
      font-size:14px;
    }
    .stack {
      margin-top:18px;
      display:grid;
      gap:12px;
    }
    .card {
      padding:16px;
      border:1px solid var(--stroke);
      border-radius:18px;
      background:rgba(255,255,255,0.04);
    }
    .card-head {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }
    .card-title {
      font-size:16px;
      font-weight:700;
      line-height:1.4;
    }
    .pill {
      display:inline-flex;
      align-items:center;
      min-height:24px;
      padding:0 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      letter-spacing:.12em;
      text-transform:uppercase;
      background:rgba(0,212,255,0.12);
      color:#dff8ff;
    }
    .card-meta {
      margin-top:8px;
      color:var(--muted);
      font-size:12px;
      line-height:1.5;
    }
    .footer {
      padding:18px 22px;
      border:1px dashed var(--stroke);
      border-radius:20px;
      color:var(--muted);
      line-height:1.6;
      font-size:14px;
    }
    a { color:#7dd3fc; }
    @media (max-width: 980px) {
      body { padding:16px; }
      .grid { grid-template-columns:1fr; }
      .meta-grid { grid-template-columns:1fr 1fr; }
      .pulse { font-size:44px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">SIGINT-MAP snapshot card</div>
      <div class="headline">
        <div class="pulse">Pulse ${escapeHtml(payload.pulse.score || 0)}</div>
        <span class="tone">${escapeHtml(payload.pulse.toneLabel || 'Steady')}</span>
      </div>
      <div class="caption">${caption}</div>
      <div class="meta-grid">
        <div class="stat"><div class="stat-label">Hot zones</div><div class="stat-value">${escapeHtml(payload.watchSummary.hot || 0)}</div></div>
        <div class="stat"><div class="stat-label">New hits</div><div class="stat-value">${escapeHtml(payload.watchSummary.newHits || 0)}</div></div>
        <div class="stat"><div class="stat-label">Briefed</div><div class="stat-value">${escapeHtml(payload.workbenchSummary.briefed || 0)}</div></div>
        <div class="stat"><div class="stat-label">Degraded feeds</div><div class="stat-value">${escapeHtml(payload.degradedSources.length)}</div></div>
      </div>
    </section>

    <section class="grid">
      <section class="panel">
        <div class="panel-title">Lead incidents</div>
        <div class="panel-subtitle">Corroborated activity prioritized by score, confidence, and source overlap.</div>
        <div class="stack">
          ${(leadIncidents.length ? leadIncidents : [{ title: 'Awaiting corroborated incidents', priority: 'P3', summary: 'The snapshot card will fill as fusion elevates live signals.', lat: null, lon: null, sources: [], confidence: 0 }]).map((incident) => `
            <article class="card">
              <div class="card-head">
                <div class="card-title">${escapeHtml(incident.title)}</div>
                <span class="pill">${escapeHtml(incident.priority || 'P3')}</span>
              </div>
              <div class="card-meta">Confidence ${escapeHtml(incident.confidence || 0)} · ${(incident.sourceCount || incident.sources?.length || 0)} sources · ${escapeHtml(formatCoords(incident.lat, incident.lon))}</div>
              <div class="card-meta">${escapeHtml(incident.summary || 'Corroborated activity highlighted for rapid triage.')}</div>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">Watch and briefing</div>
        <div class="panel-subtitle">Persistent regional monitors and curated handoff items.</div>
        <div class="stack">
          ${(watchSnapshots.length ? watchSnapshots : [{ zone: { name: 'No watch zones armed yet' }, activeCount: 0, newHits: [], resolvedIds: [], topIncident: null }]).map((snapshot) => `
            <article class="card">
              <div class="card-head">
                <div class="card-title">${escapeHtml(snapshot.zone?.name || 'Watch zone')}</div>
                <span class="pill">${snapshot.hot ? 'HOT' : 'WATCH'}</span>
              </div>
              <div class="card-meta">${escapeHtml(snapshot.activeCount || 0)} active · ${escapeHtml(snapshot.newHits?.length || 0)} new · ${escapeHtml(snapshot.resolvedIds?.length || 0)} resolved</div>
              <div class="card-meta">${escapeHtml(snapshot.topIncident?.title || 'No top incident in this zone right now.')}</div>
            </article>
          `).join('')}
          ${(briefItems.length ? briefItems : [{ title: 'No curated briefing items yet', priority: 'P3', summary: 'Promote incidents from the deck, fusion center, or watch center to populate this list.' }]).map((item) => `
            <article class="card">
              <div class="card-head">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <span class="pill">${escapeHtml(item.priority || 'P3')}</span>
              </div>
              <div class="card-meta">${escapeHtml(item.summary || 'Briefing item awaiting analyst notes.')}</div>
            </article>
          `).join('')}
        </div>
      </section>
    </section>

    <section class="footer">
      This snapshot card was generated by the SIGINT-MAP showcase suite. Reopen the live picture here:<br />
      <a href="${safeHref(payload.shareUrl)}">${escapeHtml(payload.shareUrl)}</a>
    </section>
  </main>
</body>
</html>`;
}

function injectStyles(bucket) {
  if (document.getElementById('sigint-showcase-suite-styles')) return;

  const style = document.createElement('style');
  style.id = 'sigint-showcase-suite-styles';
  style.textContent = `
    .sigint-showcase-pill {
      position:fixed;
      top:18px;
      left:50%;
      transform:translateX(-50%);
      z-index:10020;
      display:inline-flex;
      align-items:center;
      gap:10px;
      min-height:38px;
      padding:0 16px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,0.10);
      background:rgba(7,11,18,0.82);
      backdrop-filter:blur(16px);
      color:var(--color-text);
      font-family:var(--font-mono);
      font-size:11px;
      letter-spacing:.12em;
      text-transform:uppercase;
      box-shadow:0 20px 40px rgba(0,0,0,0.34);
      opacity:.86;
      transition:transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
      cursor:pointer;
    }
    .sigint-showcase-pill:hover,
    .sigint-showcase-pill:focus-visible {
      opacity:1;
      transform:translateX(-50%) translateY(-1px);
      box-shadow:0 24px 48px rgba(0,0,0,0.4);
      border-color:rgba(0,212,255,0.18);
    }
    .sigint-showcase-pill[data-active="true"] {
      border-color:rgba(0,212,255,0.24);
      box-shadow:0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.12), 0 0 28px rgba(0,212,255,0.14);
    }
    .sigint-showcase-pill__label { white-space:nowrap; }
    .sigint-showcase-pill__hint {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:28px;
      height:24px;
      padding:0 8px;
      border-radius:999px;
      background:rgba(255,255,255,0.08);
      color:var(--color-text-muted);
      font-size:10px;
      letter-spacing:.08em;
    }
    body[data-founder-mode="true"] .controls-bar {
      background:linear-gradient(180deg, rgba(6,10,16,0.92), rgba(6,10,16,0.2) 74%, transparent 100%);
    }
    body[data-founder-mode="true"] .sigint-exec-deck {
      box-shadow:0 32px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.10), 0 0 60px rgba(0,212,255,0.10);
    }
    body[data-founder-mode="true"] .sigint-showcase-pill {
      background:rgba(4,10,18,0.9);
    }
    @media (max-width: 820px) {
      .sigint-showcase-pill {
        top:12px;
        min-height:34px;
        padding:0 12px;
        font-size:10px;
      }
      .sigint-showcase-pill__hint { display:none; }
    }
  `;
  document.head.appendChild(style);
  bucket.push(() => style.remove());
}

export function createShowcaseSuite(bucket, context) {
  injectStyles(bucket);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sigint-showcase-pill';
  button.setAttribute('aria-label', 'Toggle founder mode');
  document.body.appendChild(button);
  bucket.push(() => button.remove());

  let founderMode = readStoredFlag(FOUNDER_MODE_STORAGE_KEY, false);
  let restoreState = null;

  const updateUi = () => {
    button.dataset.active = founderMode ? 'true' : 'false';
    button.innerHTML = founderMode
      ? '<span class="sigint-showcase-pill__label">Founder mode active</span><span class="sigint-showcase-pill__hint">F</span>'
      : '<span class="sigint-showcase-pill__label">Founder mode</span><span class="sigint-showcase-pill__hint">F</span>';
    document.body.dataset.founderMode = founderMode ? 'true' : 'false';
  };

  const captureRestoreState = () => ({
    mode: context.getMode?.() || 'analyst',
    deckOpen: context.executiveDeck?.isOpen?.() || false,
    touring: context.executiveDeck?.isTouring?.() || false,
  });

  const focusBestIncident = () => {
    const incident = context.fusionCenter?.getIncidents?.()?.[0]
      || context.watchCenter?.getSnapshots?.()?.find((snapshot) => snapshot?.topIncident)?.topIncident
      || null;
    if (incident) {
      context.focusIncident?.(incident);
    }
  };

  const setFounderMode = (nextValue, options = {}) => {
    const desired = !!nextValue;
    if (founderMode === desired && !options.force) {
      updateUi();
      if (options.syncUrl !== false) context.syncUrlNow?.();
      return;
    }

    founderMode = desired;
    writeStoredFlag(FOUNDER_MODE_STORAGE_KEY, founderMode);

    if (founderMode) {
      restoreState = captureRestoreState();
      context.setMode?.('briefing', { silent: true, persist: false });
      context.executiveDeck?.open?.();
      context.executiveDeck?.startTour?.();
      focusBestIncident();
      if (!options.silent) {
        context.showToast?.('Founder mode active. Briefing layout and cinematic tour engaged.', 'success');
      }
    } else {
      context.executiveDeck?.stopTour?.();
      if (restoreState) {
        context.setMode?.(restoreState.mode || 'analyst', { silent: true, persist: false });
        if (restoreState.deckOpen) context.executiveDeck?.open?.();
        else context.executiveDeck?.close?.();
        if (restoreState.touring) context.executiveDeck?.startTour?.();
        else context.executiveDeck?.stopTour?.();
      }
      restoreState = null;
      if (!options.silent) {
        context.showToast?.('Founder mode paused.', 'warning');
      }
    }

    updateUi();
    context.onFounderModeChange?.(founderMode);
    if (options.syncUrl !== false) context.syncUrlNow?.();
  };

  const toggleFounderMode = () => setFounderMode(!founderMode);

  const copyCaption = async () => {
    const payload = summarizePayload(context);
    try {
      await copyText(buildCaption(payload));
      context.showToast?.('Showcase caption copied.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Showcase caption copy failed:', error);
      context.showToast?.('Unable to copy the showcase caption.', 'danger');
    }
  };

  const exportPoster = () => {
    try {
      const payload = summarizePayload(context);
      downloadTextFile(`${buildFileStem()}-poster.svg`, 'image/svg+xml;charset=utf-8', buildPosterSvg(payload));
      context.showToast?.('Showcase poster exported.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Showcase poster export failed:', error);
      context.showToast?.('Unable to export the showcase poster.', 'danger');
    }
  };

  const exportSnapshotCard = () => {
    try {
      const payload = summarizePayload(context);
      downloadTextFile(`${buildFileStem()}-snapshot-card.html`, 'text/html;charset=utf-8', buildSnapshotCardHtml(payload));
      context.showToast?.('Snapshot card exported.', 'success');
    } catch (error) {
      console.error('[SIGINT-MAP] Snapshot card export failed:', error);
      context.showToast?.('Unable to export the snapshot card.', 'danger');
    }
  };

  const onButtonClick = () => toggleFounderMode();
  const onKeyDown = (event) => {
    const tagName = event.target?.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      toggleFounderMode();
    }
  };

  button.addEventListener('click', onButtonClick);
  document.addEventListener('keydown', onKeyDown);
  bucket.push(() => button.removeEventListener('click', onButtonClick));
  bucket.push(() => document.removeEventListener('keydown', onKeyDown));

  updateUi();
  if (founderMode) {
    setFounderMode(true, { silent: true, force: true, syncUrl: false });
  }

  window.__SIGINT_MAP_SHOWCASE_SUITE__ = {
    toggleFounderMode,
    setFounderMode,
    isFounderMode: () => founderMode,
    copyCaption,
    exportPoster,
    exportSnapshotCard,
    getSummary: () => ({ founderMode }),
  };
  bucket.push(() => { delete window.__SIGINT_MAP_SHOWCASE_SUITE__; });

  return {
    toggleFounderMode,
    setFounderMode,
    isFounderMode: () => founderMode,
    copyCaption,
    exportPoster,
    exportSnapshotCard,
    getSummary: () => ({ founderMode }),
  };
}
