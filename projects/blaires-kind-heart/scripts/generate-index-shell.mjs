#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const INDEX_SHELL_CONFIG_PATH = path.join(ROOT, 'config', 'index-shell.json');
const PANELS_CONFIG_PATH = path.join(ROOT, 'config', 'panels.json');

const HEAD_MARKER_START = '<!-- INDEX-SHELL HEAD START -->';
const HEAD_MARKER_END = '<!-- INDEX-SHELL HEAD END -->';
const HOME_MARKER_START = '<!-- INDEX-SHELL HOME BUTTONS START -->';
const HOME_MARKER_END = '<!-- INDEX-SHELL HOME BUTTONS END -->';
const PANELS_MARKER_START = '<!-- INDEX-SHELL PANELS START -->';
const PANELS_MARKER_END = '<!-- INDEX-SHELL PANELS END -->';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeOutput(source) {
  const normalized = source.replace(/\r\n?/g, '\n');
  return normalized.replace(/\n*$/, '\n');
}

function countOccurrences(source, marker) {
  return source.split(marker).length - 1;
}

function validateMarkerBlocks(source) {
  const markerCounts = [
    { marker: HEAD_MARKER_START, label: 'HEAD START' },
    { marker: HEAD_MARKER_END, label: 'HEAD END' },
    { marker: HOME_MARKER_START, label: 'HOME START' },
    { marker: HOME_MARKER_END, label: 'HOME END' },
    { marker: PANELS_MARKER_START, label: 'PANELS START' },
    { marker: PANELS_MARKER_END, label: 'PANELS END' },
  ];

  for (const markerCheck of markerCounts) {
    const count = countOccurrences(source, markerCheck.marker);
    if (count !== 1) {
      throw new Error(`Expected exactly one ${markerCheck.label} marker; found ${count}`);
    }
  }

  const headStartIndex = source.indexOf(HEAD_MARKER_START);
  const headEndIndex = source.indexOf(HEAD_MARKER_END);
  const homeStartIndex = source.indexOf(HOME_MARKER_START);
  const homeEndIndex = source.indexOf(HOME_MARKER_END);
  const panelsStartIndex = source.indexOf(PANELS_MARKER_START);
  const panelsEndIndex = source.indexOf(PANELS_MARKER_END);

  if (headStartIndex > headEndIndex) {
    throw new Error('Invalid marker order: HEAD START must appear before HEAD END');
  }
  if (homeStartIndex > homeEndIndex) {
    throw new Error('Invalid marker order: HOME START must appear before HOME END');
  }
  if (panelsStartIndex > panelsEndIndex) {
    throw new Error('Invalid marker order: PANELS START must appear before PANELS END');
  }
  if (headEndIndex > homeStartIndex) {
    throw new Error('Invalid marker order: HEAD block must end before HOME block starts');
  }
  if (homeEndIndex > panelsStartIndex) {
    throw new Error('Invalid marker order: HOME block must end before PANELS block starts');
  }
}

function collectDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return Array.from(duplicates);
}

function assertUnique(values, label) {
  const duplicates = collectDuplicates(values);
  if (duplicates.length > 0) {
    throw new Error(`${label} has duplicate entries: ${duplicates.join(', ')}`);
  }
}

function validateHeadDirectives(indexShellConfig) {
  const head = indexShellConfig.head ?? {};

  assertUnique(head.copy_files ?? [], 'head.copy_files');
  assertUnique(head.sqlite_copy_dirs ?? [], 'head.sqlite_copy_dirs');
  assertUnique(head.asset_copy_dirs ?? [], 'head.asset_copy_dirs');
  assertUnique(head.asset_copy_files ?? [], 'head.asset_copy_files');
  assertUnique(head.shader_copy_dirs ?? [], 'head.shader_copy_dirs');
  assertUnique(head.critical_css ?? [], 'head.critical_css');
  assertUnique(head.panel_css ?? [], 'head.panel_css');

  const preloadHrefs = (head.preloads ?? [])
    .map((preload) => preload?.href)
    .filter((href) => typeof href === 'string');
  assertUnique(preloadHrefs, 'head.preloads href');

  const scriptKeys = (head.scripts ?? [])
    .map((script) => `${typeof script?.type === 'string' ? script.type : ''}|${script?.src ?? ''}`);
  assertUnique(scriptKeys, 'head.scripts');
}

function validateHomeButtons(indexShellConfig) {
  const buttons = indexShellConfig?.home?.buttons ?? [];
  if (!Array.isArray(buttons) || buttons.length === 0) {
    throw new Error('config/index-shell.json home.buttons must be a non-empty array');
  }

  const seenPanels = new Set();
  for (const [index, button] of buttons.entries()) {
    if (!button || typeof button !== 'object') {
      throw new Error(`home.buttons[${index}] must be an object`);
    }
    for (const key of ['panel', 'class', 'img', 'alt', 'label']) {
      if (typeof button[key] !== 'string' || button[key].length === 0) {
        throw new Error(`home.buttons[${index}].${key} must be a non-empty string`);
      }
    }

    if (seenPanels.has(button.panel)) {
      throw new Error(`home.buttons has duplicate panel target: ${button.panel}`);
    }
    seenPanels.add(button.panel);

    if (button.badge !== undefined) {
      if (!button.badge || typeof button.badge !== 'object') {
        throw new Error(`home.buttons[${index}].badge must be an object when provided`);
      }
      for (const key of ['class', 'aria', 'default', 'data_attr']) {
        if (typeof button.badge[key] !== 'string' || button.badge[key].length === 0) {
          throw new Error(`home.buttons[${index}].badge.${key} must be a non-empty string`);
        }
      }
      if (!button.badge.data_attr.startsWith('data-')) {
        throw new Error(`home.buttons[${index}].badge.data_attr must start with "data-"`);
      }
    }
  }
}

function replaceMarkedBlock(source, startMarker, endMarker, content) {
  const pattern = new RegExp(
    `(^[ \\t]*)${escapeRegExp(startMarker)}[\\s\\S]*?^[ \\t]*${escapeRegExp(endMarker)}`,
    'm',
  );
  if (!pattern.test(source)) {
    throw new Error(`Missing marker block: ${startMarker} ... ${endMarker}`);
  }
  return source.replace(pattern, (_, indent) => `${indent}${startMarker}\n${content}\n${indent}${endMarker}`);
}

function validatePanelOrder(indexShellConfig, panelsConfig) {
  const panelIdsFromPanels = (panelsConfig?.panels ?? [])
    .map((panel) => panel?.id)
    .filter((panelId) => typeof panelId === 'string' && panelId !== 'home-scene');

  const panelIdsFromIndexShell = [...(indexShellConfig?.panels?.order ?? [])];

  if (panelIdsFromPanels.length === 0) {
    throw new Error('config/panels.json has no panel ids to validate');
  }

  const duplicatePanelIds = collectDuplicates(panelIdsFromIndexShell);
  if (duplicatePanelIds.length > 0) {
    throw new Error(`config/index-shell.json panels.order has duplicate panel ids: ${duplicatePanelIds.join(', ')}`);
  }

  if (
    panelIdsFromPanels.length !== panelIdsFromIndexShell.length ||
    panelIdsFromPanels.some((panelId, index) => panelIdsFromIndexShell[index] !== panelId)
  ) {
    throw new Error(
      `config/index-shell.json panels.order must exactly match config/panels.json panel ids in order (excluding home-scene)\nexpected=${JSON.stringify(panelIdsFromPanels)}\nactual=${JSON.stringify(panelIdsFromIndexShell)}`,
    );
  }
}

function renderHead(indexShellConfig) {
  const head = indexShellConfig.head;
  const lines = [];

  for (const href of head.copy_files) {
    lines.push(`  <link data-trunk rel="copy-file" href="${href}" />`);
  }

  lines.push('  <!-- SQLite WASM loaded from public/sqlite/ -->');
  for (const href of head.sqlite_copy_dirs) {
    lines.push(`  <link data-trunk rel="copy-dir" href="${href}" />`);
  }

  lines.push('');
  lines.push('  <!-- Generated visual assets (Imagen 3 Pro) -->');
  for (const href of head.asset_copy_dirs) {
    lines.push(`  <link data-trunk rel="copy-dir" href="${href}" />`);
  }
  for (const href of head.asset_copy_files) {
    lines.push(`  <link data-trunk rel="copy-file" href="${href}" />`);
  }

  lines.push('');
  lines.push('  <!-- WGSL shaders — Trunk copies to dist/ for include_str!() at compile time -->');
  for (const href of head.shader_copy_dirs) {
    lines.push(`  <link data-trunk rel="copy-dir" href="${href}" />`);
  }

  lines.push('');
  for (const preload of head.preloads) {
    lines.push(`  <!-- ${preload.comment} -->`);
    lines.push(
      `  <link rel="preload" as="${preload.as}" href="${preload.href}" fetchpriority="${preload.fetchpriority}" />`,
    );
    lines.push('');
  }

  for (const script of head.scripts) {
    if (script.type) {
      lines.push(`  <script type="${script.type}" src="${script.src}"></script>`);
    } else {
      lines.push(`  <script src="${script.src}"></script>`);
    }
  }

  const rustLink = head.rust_link;
  lines.push(
    `  <link data-trunk rel="rust" href="${rustLink.href}" data-target-name="${rustLink['data-target-name']}" data-wasm-opt="${rustLink['data-wasm-opt']}" data-bindgen-target="${rustLink['data-bindgen-target']}" />`,
  );

  lines.push('');
  lines.push(`  <title>${head.title}</title>`);
  lines.push('');
  lines.push('  <!-- CRITICAL CSS: Needed for first paint (<2s target) -->');
  for (const href of head.critical_css) {
    lines.push(`  <link data-trunk rel="css" href="${href}" />`);
  }

  lines.push('');
  lines.push('  <!-- Panel-specific CSS: Trunk bundles all, browser loads on parse -->');
  for (const href of head.panel_css) {
    lines.push(`  <link data-trunk rel="css" href="${href}" />`);
  }

  return lines.join('\n').replace(/\n\n\n+/g, '\n\n').trimEnd();
}

function renderHomeButtons(indexShellConfig) {
  const lines = [];
  for (const button of indexShellConfig.home.buttons) {
    lines.push(
      `        <button class="${button.class}" data-panel-open="${button.panel}" data-home-btn>`,
    );
    lines.push(
      `          <img class="home-btn-img" src="${button.img}" alt="${button.alt}" aria-hidden="true" />`,
    );
    lines.push(`          <span class="home-btn-label">${button.label}</span>`);
    if (button.badge) {
      lines.push(
        `          <span class="${button.badge.class}" ${button.badge.data_attr} aria-label="${button.badge.aria}">${button.badge.default}</span>`,
      );
    }
    lines.push('        </button>');
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function renderPanelHeader(panelId, includeTrackerCounter) {
  const lines = [
    '      <header class="panel-header">',
    `        <nav class="breadcrumb" data-panel-id="${panelId}" aria-label="Navigation">`,
    '          <span class="breadcrumb-current" data-breadcrumb-current aria-current="page"></span>',
    '        </nav>',
    '        <h2 class="panel-title">Panel</h2>',
  ];

  if (includeTrackerCounter) {
    lines.push('        <div class="heart-counter" data-tracker-hearts>');
    lines.push('          <span class="heart-icon" aria-hidden="true">&#x1F49C;</span>');
    lines.push('          <span data-tracker-hearts-count aria-live="polite">0</span>');
    lines.push('        </div>');
  }

  lines.push('      </header>');
  return lines;
}

function standardBodyId(panelId) {
  return `${panelId.replace(/^panel-/, '')}-body`;
}

function renderStandardPanelBody(panelId, commentMap) {
  const bodyId = standardBodyId(panelId);
  const comment = commentMap[panelId] ?? 'Populated by runtime';
  return [
    `      <div id="${bodyId}" class="panel-body">`,
    `        <!-- ${comment} -->`,
    '      </div>',
  ];
}

function renderIntermediaryPanelBody(panelId, intermediaryConfig) {
  const entryLines = [];
  for (const entry of intermediaryConfig.entries) {
    entryLines.push(`          <button class="home-btn" data-panel-open="${entry.panel}" aria-label="${entry.aria}">`);
    entryLines.push(
      `            <img class="home-btn-img" src="${entry.img}" alt="${entry.alt}" aria-hidden="true" />`,
    );
    entryLines.push(`            <span class="home-btn-label">${entry.label}</span>`);
    entryLines.push('          </button>');
  }

  return [
    '      <div class="panel-body">',
    `        <nav class="home-grid" aria-label="${intermediaryConfig.grid_aria}">`,
    ...entryLines,
    '        </nav>',
    '      </div>',
  ];
}

function renderGamesExtras() {
  return [
    '      <div id="game-arena" class="game-arena" hidden role="region" aria-label="Game play area">',
    '        <!-- Individual game renders here (catcher, memory, hug, paint, unicorn) -->',
    '      </div>',
    '      <button id="game-exit-btn" class="floating-back-btn" hidden aria-label="Exit Game">⬅️</button>',
  ];
}

function renderPanels(indexShellConfig) {
  const panelConfig = indexShellConfig.panels;
  const lines = [];

  for (const panelId of panelConfig.order) {
    const comment = panelConfig.comments?.[panelId] ?? panelId.toUpperCase();
    lines.push(`    <!-- ====== ${comment} ====== -->`);
    lines.push(
      `    <section id="${panelId}" class="panel" data-panel-id="${panelId}" aria-label="Panel" hidden>`,
    );

    const includeTrackerCounter = panelId === 'panel-tracker';
    lines.push(...renderPanelHeader(panelId, includeTrackerCounter));

    const intermediaryConfig = panelConfig.intermediary?.[panelId];
    if (intermediaryConfig) {
      lines.push(...renderIntermediaryPanelBody(panelId, intermediaryConfig));
    } else {
      lines.push(...renderStandardPanelBody(panelId, panelConfig.standard_body_comments ?? {}));
    }

    if (panelId === 'panel-games') {
      lines.push(...renderGamesExtras());
    }

    lines.push('    </section>');
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

async function main() {
  const [indexHtml, indexShellConfigRaw, panelsConfigRaw] = await Promise.all([
    readFile(INDEX_PATH, 'utf8'),
    readFile(INDEX_SHELL_CONFIG_PATH, 'utf8'),
    readFile(PANELS_CONFIG_PATH, 'utf8'),
  ]);

  const indexShellConfig = JSON.parse(indexShellConfigRaw);
  const panelsConfig = JSON.parse(panelsConfigRaw);

  validateMarkerBlocks(indexHtml);
  validatePanelOrder(indexShellConfig, panelsConfig);
  validateHeadDirectives(indexShellConfig);
  validateHomeButtons(indexShellConfig);

  const renderedHead = renderHead(indexShellConfig);
  const renderedHomeButtons = renderHomeButtons(indexShellConfig);
  const renderedPanels = renderPanels(indexShellConfig);

  let updated = indexHtml;
  updated = replaceMarkedBlock(updated, HEAD_MARKER_START, HEAD_MARKER_END, renderedHead);
  updated = replaceMarkedBlock(updated, HOME_MARKER_START, HOME_MARKER_END, renderedHomeButtons);
  updated = replaceMarkedBlock(updated, PANELS_MARKER_START, PANELS_MARKER_END, renderedPanels);
  updated = normalizeOutput(updated);
  const normalizedExisting = normalizeOutput(indexHtml);

  if (updated !== normalizedExisting) {
    await writeFile(INDEX_PATH, updated, 'utf8');
    console.log('✅ Updated generated index shell regions');
  } else {
    console.log('✅ Index shell generated regions already up-to-date');
  }
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
