#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const JS_PATH = path.join(ROOT, 'public', 'panel-registry.js');
const RUST_PATH = path.join(ROOT, 'rust', 'panel_registry_generated.rs');
const INDEX_PATH = path.join(ROOT, 'index.html');

const ALLOWED_JS_KEYS = new Set([
  'id',
  'parent',
  'breadcrumb',
  'theme_token',
  'panel_title',
  'panel_aria',
]);

const FORBIDDEN_JS_KEYS = ['narration_phrase', 'first_visit_tip', 'sound_key'];
const FORBIDDEN_RUST_FIELDS = ['parent:', 'breadcrumb_icon:', 'breadcrumb_label:', 'breadcrumb_aria:', 'panel_title:', 'panel_aria:', 'theme_token:'];

function loadRegistryFromEsmSource(source) {
  const pattern = /export const PANEL_REGISTRY = Object\.freeze\(([\s\S]*?)\);\s*export default PANEL_REGISTRY;\s*$/;
  const match = source.match(pattern);
  if (!match) {
    throw new Error('public/panel-registry.js does not expose ESM PANEL_REGISTRY exports');
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(
      `public/panel-registry.js PANEL_REGISTRY payload is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function main() {
  const [jsSource, rustSource, indexSource] = await Promise.all([
    readFile(JS_PATH, 'utf8'),
    readFile(RUST_PATH, 'utf8'),
    readFile(INDEX_PATH, 'utf8'),
  ]);

  const registry = loadRegistryFromEsmSource(jsSource);
  if (!registry || typeof registry !== 'object') {
    throw new Error('public/panel-registry.js does not define PANEL_REGISTRY object');
  }

  if (jsSource.includes('BKH_PANEL_REGISTRY')) {
    failures.push('public/panel-registry.js should not expose BKH_PANEL_REGISTRY global');
  }

  const failures = [];
  for (const [panelId, panel] of Object.entries(registry)) {
    if (!panel || typeof panel !== 'object') {
      failures.push(`${panelId}: panel metadata is not an object`);
      continue;
    }

    for (const key of Object.keys(panel)) {
      if (!ALLOWED_JS_KEYS.has(key)) {
        failures.push(`${panelId}: unexpected key in JS registry (${key})`);
      }
    }

    for (const key of FORBIDDEN_JS_KEYS) {
      if (Object.prototype.hasOwnProperty.call(panel, key)) {
        failures.push(`${panelId}: forbidden JS key present (${key})`);
      }
    }

    if (panelId === 'home-scene') {
      continue;
    }

    const sectionPattern = new RegExp(
      `<section(?=[^>]*\\bid=\"${panelId}\")(?=[^>]*\\bdata-panel-id=\"${panelId}\")[^>]*>`,
      'i',
    );
    if (!sectionPattern.test(indexSource)) {
      failures.push(`${panelId}: missing matching section contract in index.html`);
    }
  }

  for (const field of FORBIDDEN_RUST_FIELDS) {
    if (rustSource.includes(field)) {
      failures.push(`rust/panel_registry_generated.rs contains forbidden UI field (${field})`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-panel-registry-shape] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log('[qa-panel-registry-shape] PASS panel registry artifacts are runtime-scoped');
}

main().catch((error) => {
  console.error(`[qa-panel-registry-shape] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
