#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const PANELS_CONFIG_PATH = path.join(ROOT, 'config', 'panels.json');
const INDEX_SHELL_CONFIG_PATH = path.join(ROOT, 'config', 'index-shell.json');

export const REQUIRED_CONTRACT_INVARIANT_IDS = [
  'head-marker-block',
  'home-marker-block',
  'home-shell-contract',
  'panel-marker-block',
  'panel-shell-contract',
  'breadcrumb-template-contract',
  'trunk-head-directive-contract',
  'runtime-script-contract',
  'panel-open-entrypoints',
  'games-shell-controls',
  'registry-breadcrumb-hydration',
  'hash-deeplink-restore',
];

export const ALLOWED_CONTRACT_GATES = new Set(['static', 'generator', 'e2e']);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasTag(source, tagName, attrs) {
  const lookaheads = Object.entries(attrs)
    .map(([name, value]) => {
      if (value === true) {
        return `(?=[^>]*\\b${escapeRegExp(name)}\\b)`;
      }
      return `(?=[^>]*\\b${escapeRegExp(name)}=\"${escapeRegExp(String(value))}\")`;
    })
    .join('');

  const pattern = new RegExp(`<${tagName}\\b${lookaheads}[^>]*>`, 'i');
  return pattern.test(source);
}

function hasPanelSection(source, panelId) {
  const pattern = new RegExp(
    `<section(?=[^>]*\\bid=\"${escapeRegExp(panelId)}\")(?=[^>]*\\bdata-panel-id=\"${escapeRegExp(panelId)}\")(?=[^>]*\\bclass=\"[^\"]*\\bpanel\\b[^\"]*\")(?=[^>]*\\bhidden\\b)[^>]*>`,
    'i',
  );
  return pattern.test(source);
}

function extractPanelSection(source, panelId) {
  const pattern = new RegExp(
    `<section[^>]*\\bid=\"${escapeRegExp(panelId)}\"[^>]*>[\\s\\S]*?<\\/section>`,
    'i',
  );
  const match = source.match(pattern);
  return match ? match[0] : null;
}

function assertRequiredTag(source, failures, description, tagName, attrs) {
  if (!hasTag(source, tagName, attrs)) {
    failures.push(`${description}: missing <${tagName}> with required attrs ${JSON.stringify(attrs)}`);
  }
}

function countMatches(source, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  return Array.from(source.matchAll(globalPattern)).length;
}

export function collectContractInvariantCoverageFailures(contractInvariants) {
  const failures = [];

  if (!Array.isArray(contractInvariants)) {
    failures.push('qa.contract_invariants must be an array in config/index-shell.json');
    return failures;
  }

  const seen = new Set();
  for (const invariant of contractInvariants) {
    if (!invariant || typeof invariant !== 'object') {
      failures.push('qa.contract_invariants contains non-object entry');
      continue;
    }

    const id = invariant.id;
    const gate = invariant.gate;

    if (typeof id !== 'string' || id.length === 0) {
      failures.push('qa.contract_invariants contains entry with missing id');
      continue;
    }

    if (seen.has(id)) {
      failures.push(`qa.contract_invariants duplicate invariant id: ${id}`);
    }
    seen.add(id);

    if (!ALLOWED_CONTRACT_GATES.has(gate)) {
      failures.push(`qa.contract_invariants invalid gate for ${id}: ${String(gate)}`);
    }
  }

  for (const requiredId of REQUIRED_CONTRACT_INVARIANT_IDS) {
    if (!seen.has(requiredId)) {
      failures.push(`qa.contract_invariants missing required invariant id: ${requiredId}`);
    }
  }

  return failures;
}

export function collectIndexShellContractFailures(
  indexHtml,
  panelIds,
  contractInvariants = [],
  homeButtons = [],
) {
  const failures = [];

  failures.push(...collectContractInvariantCoverageFailures(contractInvariants));

  const requiredSnippets = [
    { description: 'loading screen root', regex: /<div[^>]*\bid=\"loading-screen\"[^>]*\bclass=\"[^\"]*\bloading-screen\b[^\"]*\"[^>]*>/i },
    { description: 'skip link', regex: /<a(?=[^>]*\bhref=\"#app\")(?=[^>]*\bclass=\"[^\"]*\bskip-link\b[^\"]*\")[^>]*>/i },
    { description: 'home breadcrumb template', regex: /<template[^>]*\bid=\"breadcrumb-home-template\"[^>]*>/i },
    { description: 'parent breadcrumb template', regex: /<template[^>]*\bid=\"breadcrumb-parent-template\"[^>]*>/i },
    { description: 'app shell container', regex: /<div[^>]*\bclass=\"[^\"]*\bapp-shell\b[^\"]*\"[^>]*>/i },
    { description: 'home scene root', regex: /<main[^>]*\bid=\"app\"[^>]*\bclass=\"[^\"]*\bhome-scene\b[^\"]*\"[^>]*>/i },
    { description: 'companion landmark', regex: /<aside[^>]*\bclass=\"[^\"]*\bcompanion-landmark\b[^\"]*\"[^>]*>/i },
    { description: 'critical token start marker', regex: /\/\* GENERATED CRITICAL TOKENS START \*\// },
    { description: 'critical token end marker', regex: /\/\* GENERATED CRITICAL TOKENS END \*\// },
    { description: 'index head marker start', regex: /<!-- INDEX-SHELL HEAD START -->/ },
    { description: 'index head marker end', regex: /<!-- INDEX-SHELL HEAD END -->/ },
    { description: 'index home marker start', regex: /<!-- INDEX-SHELL HOME BUTTONS START -->/ },
    { description: 'index home marker end', regex: /<!-- INDEX-SHELL HOME BUTTONS END -->/ },
    { description: 'index panels marker start', regex: /<!-- INDEX-SHELL PANELS START -->/ },
    { description: 'index panels marker end', regex: /<!-- INDEX-SHELL PANELS END -->/ },
    { description: 'document title', regex: /<title>\s*Blaire's Kind Heart\s*<\/title>/i },
  ];

  for (const check of requiredSnippets) {
    if (!check.regex.test(indexHtml)) {
      failures.push(`${check.description}: missing contract snippet`);
    }
  }

  const markerMultiplicityChecks = [
    { description: 'index head marker start', pattern: /<!-- INDEX-SHELL HEAD START -->/ },
    { description: 'index head marker end', pattern: /<!-- INDEX-SHELL HEAD END -->/ },
    { description: 'index home marker start', pattern: /<!-- INDEX-SHELL HOME BUTTONS START -->/ },
    { description: 'index home marker end', pattern: /<!-- INDEX-SHELL HOME BUTTONS END -->/ },
    { description: 'index panels marker start', pattern: /<!-- INDEX-SHELL PANELS START -->/ },
    { description: 'index panels marker end', pattern: /<!-- INDEX-SHELL PANELS END -->/ },
  ];

  for (const check of markerMultiplicityChecks) {
    const count = countMatches(indexHtml, check.pattern);
    if (count !== 1) {
      failures.push(`${check.description}: expected exactly 1 marker, found ${count}`);
    }
  }

  const requiredCopyFiles = [
    'manifest.webmanifest',
    'wasm-init.js',
    'public/sw.js',
    'public/sw-assets.js',
    'public/db-worker.js',
    'public/db-contract.js',
    'public/asset-manifest.js',
    'public/panel-registry.js',
    'public/runtime-diagnostics.js',
    'public/offline.html',
    'public/offline.js',
    'assets/noise.webp',
  ];

  for (const href of requiredCopyFiles) {
    assertRequiredTag(indexHtml, failures, `trunk copy-file ${href}`, 'link', {
      'data-trunk': true,
      rel: 'copy-file',
      href,
    });
  }

  const requiredCopyDirs = [
    'public/sqlite',
    'assets/icons',
    'assets/illustrations',
    'assets/game-sprites',
    'assets/companions',
    'assets/gardens',
    'shaders',
  ];

  for (const href of requiredCopyDirs) {
    assertRequiredTag(indexHtml, failures, `trunk copy-dir ${href}`, 'link', {
      'data-trunk': true,
      rel: 'copy-dir',
      href,
    });
  }

  const requiredCssFiles = [
    'src/styles/tokens.css',
    'src/styles/generated-animation-timings.css',
    'src/styles/app.css',
    'src/styles/home.css',
    'src/styles/animations.css',
    'src/styles/tracker.css',
    'src/styles/quests.css',
    'src/styles/stories.css',
    'src/styles/rewards.css',
    'src/styles/games.css',
    'src/styles/mom.css',
    'src/styles/progress.css',
    'src/styles/gardens.css',
    'src/styles/particles.css',
    'src/styles/scroll-effects.css',
  ];

  for (const href of requiredCssFiles) {
    assertRequiredTag(indexHtml, failures, `trunk css ${href}`, 'link', {
      'data-trunk': true,
      rel: 'css',
      href,
    });
  }

  assertRequiredTag(indexHtml, failures, 'app runtime bundle script', 'script', {
    src: './blaires-kind-heart.js',
  });
  assertRequiredTag(indexHtml, failures, 'wasm init module script', 'script', {
    type: 'module',
    src: './wasm-init.js?wasm=blaires-kind-heart_bg.wasm',
  });

  const requiredHomeEntrypoints = ['panel-tracker', 'panel-adventures', 'panel-mystuff'];
  for (const panelId of requiredHomeEntrypoints) {
    const homeBtnRegex = new RegExp(
      `<button(?=[^>]*\\bdata-panel-open="${escapeRegExp(panelId)}")(?=[^>]*\\bdata-home-btn\\b)[^>]*>`,
      'i',
    );
    if (!homeBtnRegex.test(indexHtml)) {
      failures.push(`missing top-level home entrypoint for ${panelId}`);
    }
  }

  for (const [index, button] of homeButtons.entries()) {
    const open = typeof button?.panel === 'string' ? button.panel : '';
    const cls = typeof button?.class === 'string' ? button.class : '';
    const img = typeof button?.img === 'string' ? button.img : '';
    const label = typeof button?.label === 'string' ? button.label : '';
    const alt = typeof button?.alt === 'string' ? button.alt : '';
    if (!open || !cls || !img || !label || !alt) {
      failures.push(`home button ${index} has invalid metadata`);
      continue;
    }

    const buttonRegex = new RegExp(
      `<button(?=[^>]*\\bclass="${escapeRegExp(cls)}")(?=[^>]*\\bdata-panel-open="${escapeRegExp(open)}")(?=[^>]*\\bdata-home-btn\\b)[^>]*>[\\s\\S]*?<img(?=[^>]*\\bclass="home-btn-img")(?=[^>]*\\bsrc="${escapeRegExp(img)}")(?=[^>]*\\balt="${escapeRegExp(alt)}")[^>]*>[\\s\\S]*?<span(?=[^>]*\\bclass="home-btn-label")[^>]*>${escapeRegExp(label)}<\\/span>[\\s\\S]*?<\\/button>`,
      'i',
    );
    if (!buttonRegex.test(indexHtml)) {
      failures.push(`home button contract mismatch for ${open}`);
    }

    if (button?.badge && typeof button.badge === 'object') {
      const badgeClass = button.badge.class;
      const badgeAria = button.badge.aria;
      const badgeDefault = button.badge.default;
      const badgeAttr = button.badge.data_attr;
      if (
        typeof badgeClass !== 'string' ||
        typeof badgeAria !== 'string' ||
        typeof badgeDefault !== 'string' ||
        typeof badgeAttr !== 'string'
      ) {
        failures.push(`home button badge metadata invalid for ${open}`);
      } else {
        const badgeRegex = new RegExp(
          `<span(?=[^>]*\\bclass="${escapeRegExp(badgeClass)}")(?=[^>]*\\b${escapeRegExp(badgeAttr)}\\b)(?=[^>]*\\baria-label="${escapeRegExp(badgeAria)}")[^>]*>${escapeRegExp(badgeDefault)}<\\/span>`,
          'i',
        );
        if (!badgeRegex.test(indexHtml)) {
          failures.push(`home button badge contract mismatch for ${open}`);
        }
      }
    }
  }

  assertRequiredTag(indexHtml, failures, 'trunk rust pipeline link', 'link', {
    'data-trunk': true,
    rel: 'rust',
    href: 'Cargo.toml',
    'data-target-name': 'blaires_kind_heart',
    'data-wasm-opt': '0',
    'data-bindgen-target': 'no-modules',
  });

  for (const panelId of panelIds) {
    if (!hasPanelSection(indexHtml, panelId)) {
      failures.push(`${panelId}: missing panel section contract (id/class/data-panel-id/hidden)`);
      continue;
    }

    const section = extractPanelSection(indexHtml, panelId);
    if (!section) {
      failures.push(`${panelId}: could not isolate section block`);
      continue;
    }

    const breadcrumbRegex = new RegExp(
      `<nav(?=[^>]*\\bclass=\"[^\"]*\\bbreadcrumb\\b[^\"]*\")(?=[^>]*\\bdata-panel-id=\"${escapeRegExp(panelId)}\")[^>]*>`,
      'i',
    );
    if (!breadcrumbRegex.test(section)) {
      failures.push(`${panelId}: missing breadcrumb nav with matching data-panel-id`);
    }

    if (!/<span[^>]*\bdata-breadcrumb-current\b[^>]*>/i.test(section)) {
      failures.push(`${panelId}: missing [data-breadcrumb-current] span`);
    }

    if (!/<h2[^>]*\bclass=\"[^\"]*\bpanel-title\b[^\"]*\"[^>]*>/i.test(section)) {
      failures.push(`${panelId}: missing .panel-title heading`);
    }
  }

  const requiredPanelOpenTargets = [
    'panel-tracker',
    'panel-adventures',
    'panel-mystuff',
    'panel-quests',
    'panel-stories',
    'panel-games',
    'panel-rewards',
    'panel-gardens',
    'panel-progress',
  ];

  for (const panelId of requiredPanelOpenTargets) {
    const panelOpenRegex = new RegExp(`\\bdata-panel-open=\"${escapeRegExp(panelId)}\"`, 'i');
    if (!panelOpenRegex.test(indexHtml)) {
      failures.push(`missing data-panel-open trigger for ${panelId}`);
    }
  }

  const requiredPanelBodies = [
    'tracker-body',
    'quests-body',
    'stories-body',
    'rewards-body',
    'games-body',
    'progress-body',
    'gardens-body',
  ];

  for (const bodyId of requiredPanelBodies) {
    const bodyRegex = new RegExp(`<div[^>]*\\bid=\"${escapeRegExp(bodyId)}\"[^>]*\\bclass=\"[^\"]*\\bpanel-body\\b[^\"]*\"`, 'i');
    if (!bodyRegex.test(indexHtml)) {
      failures.push(`missing panel body container #${bodyId}`);
    }
  }

  assertRequiredTag(indexHtml, failures, 'game arena container', 'div', {
    id: 'game-arena',
    class: 'game-arena',
    hidden: true,
    role: 'region',
    'aria-label': 'Game play area',
  });

  assertRequiredTag(indexHtml, failures, 'game exit button', 'button', {
    id: 'game-exit-btn',
    class: 'floating-back-btn',
    hidden: true,
    'aria-label': 'Exit Game',
  });

  return failures;
}

export async function loadPanelIdsFromPanelsConfig() {
  const panelsConfigRaw = await readFile(PANELS_CONFIG_PATH, 'utf8');
  const panelsConfig = JSON.parse(panelsConfigRaw);
  return (panelsConfig?.panels ?? [])
    .map((panel) => panel?.id)
    .filter((panelId) => typeof panelId === 'string' && panelId !== 'home-scene');
}

export async function loadContractInvariantsFromIndexShellConfig() {
  const indexShellConfigRaw = await readFile(INDEX_SHELL_CONFIG_PATH, 'utf8');
  const indexShellConfig = JSON.parse(indexShellConfigRaw);
  return indexShellConfig?.qa?.contract_invariants ?? [];
}

export async function loadHomeButtonsFromIndexShellConfig() {
  const indexShellConfigRaw = await readFile(INDEX_SHELL_CONFIG_PATH, 'utf8');
  const indexShellConfig = JSON.parse(indexShellConfigRaw);
  return indexShellConfig?.home?.buttons ?? [];
}

async function main() {
  const [indexHtml, panelIds, contractInvariants, homeButtons] = await Promise.all([
    readFile(INDEX_PATH, 'utf8'),
    loadPanelIdsFromPanelsConfig(),
    loadContractInvariantsFromIndexShellConfig(),
    loadHomeButtonsFromIndexShellConfig(),
  ]);

  const failures = collectIndexShellContractFailures(
    indexHtml,
    panelIds,
    contractInvariants,
    homeButtons,
  );

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-index-shell-contract] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `[qa-index-shell-contract] PASS panels=${panelIds.length} invariants=${contractInvariants.length} gateTypes=${Array.from(ALLOWED_CONTRACT_GATES).join(',')}`,
  );
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsScript) {
  main().catch((error) => {
    console.error(`[qa-index-shell-contract] FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
