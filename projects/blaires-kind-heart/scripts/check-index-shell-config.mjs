#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ALLOWED_CONTRACT_GATES,
  REQUIRED_CONTRACT_INVARIANT_IDS,
  collectContractInvariantCoverageFailures,
} from './check-index-shell-contract.mjs';

const ROOT = process.cwd();
const INDEX_SHELL_CONFIG_PATH = path.join(ROOT, 'config', 'index-shell.json');
const PANELS_CONFIG_PATH = path.join(ROOT, 'config', 'panels.json');

function assertObject(value, label, failures) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failures.push(`${label} must be an object`);
    return false;
  }
  return true;
}

function assertStringArray(value, label, failures) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array`);
    return false;
  }

  const badIndex = value.findIndex((item) => typeof item !== 'string' || item.length === 0);
  if (badIndex !== -1) {
    failures.push(`${label}[${badIndex}] must be a non-empty string`);
    return false;
  }

  return true;
}

function collectDuplicateFailures(values, label) {
  const failures = [];
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      failures.push(`${label} duplicate value: ${value}`);
      continue;
    }
    seen.add(value);
  }
  return failures;
}

function keyExists(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

async function main() {
  const [indexShellConfigRaw, panelsConfigRaw] = await Promise.all([
    readFile(INDEX_SHELL_CONFIG_PATH, 'utf8'),
    readFile(PANELS_CONFIG_PATH, 'utf8'),
  ]);

  const indexShellConfig = JSON.parse(indexShellConfigRaw);
  const panelsConfig = JSON.parse(panelsConfigRaw);
  const failures = [];

  if (!assertObject(indexShellConfig, 'config/index-shell.json', failures)) {
    for (const failure of failures) {
      console.error(`[qa-index-shell-config] FAIL ${failure}`);
    }
    process.exit(1);
  }

  for (const requiredKey of ['head', 'home', 'panels', 'qa']) {
    if (!keyExists(indexShellConfig, requiredKey)) {
      failures.push(`config/index-shell.json missing top-level key: ${requiredKey}`);
    }
  }

  const head = indexShellConfig.head;
  const home = indexShellConfig.home;
  const panels = indexShellConfig.panels;
  const qa = indexShellConfig.qa;

  if (
    !assertObject(head, 'head', failures) ||
    !assertObject(home, 'home', failures) ||
    !assertObject(panels, 'panels', failures) ||
    !assertObject(qa, 'qa', failures)
  ) {
    for (const failure of failures) {
      console.error(`[qa-index-shell-config] FAIL ${failure}`);
    }
    process.exit(1);
  }

  if (!Array.isArray(home.buttons)) {
    failures.push('home.buttons must be an array');
  } else if (home.buttons.length === 0) {
    failures.push('home.buttons must contain at least one entry');
  } else {
    const seenHomeTargets = new Set();
    for (let index = 0; index < home.buttons.length; index += 1) {
      const button = home.buttons[index];
      if (!assertObject(button, `home.buttons[${index}]`, failures)) {
        continue;
      }

      for (const key of ['panel', 'class', 'img', 'alt', 'label']) {
        if (typeof button[key] !== 'string' || button[key].length === 0) {
          failures.push(`home.buttons[${index}].${key} must be a non-empty string`);
        }
      }

      if (typeof button.panel === 'string') {
        if (seenHomeTargets.has(button.panel)) {
          failures.push(`home.buttons duplicate panel target: ${button.panel}`);
        }
        seenHomeTargets.add(button.panel);
      }

      if (button.badge !== undefined) {
        if (!assertObject(button.badge, `home.buttons[${index}].badge`, failures)) {
          continue;
        }
        for (const key of ['class', 'aria', 'default', 'data_attr']) {
          if (typeof button.badge[key] !== 'string' || button.badge[key].length === 0) {
            failures.push(`home.buttons[${index}].badge.${key} must be a non-empty string`);
          }
        }
        if (typeof button.badge.data_attr === 'string' && !button.badge.data_attr.startsWith('data-')) {
          failures.push(`home.buttons[${index}].badge.data_attr must start with "data-"`);
        }
      }
    }
  }

  const requiredHeadArrays = [
    'copy_files',
    'sqlite_copy_dirs',
    'asset_copy_dirs',
    'asset_copy_files',
    'shader_copy_dirs',
    'critical_css',
    'panel_css',
  ];

  for (const key of requiredHeadArrays) {
    if (!keyExists(head, key)) {
      failures.push(`head missing key: ${key}`);
      continue;
    }

    if (assertStringArray(head[key], `head.${key}`, failures)) {
      failures.push(...collectDuplicateFailures(head[key], `head.${key}`));
    }
  }

  if (!Array.isArray(head.preloads)) {
    failures.push('head.preloads must be an array');
  } else {
    const preloadHrefs = [];
    for (let index = 0; index < head.preloads.length; index += 1) {
      const preload = head.preloads[index];
      if (!assertObject(preload, `head.preloads[${index}]`, failures)) {
        continue;
      }
      for (const key of ['comment', 'as', 'href', 'fetchpriority']) {
        if (typeof preload[key] !== 'string' || preload[key].length === 0) {
          failures.push(`head.preloads[${index}].${key} must be a non-empty string`);
        }
      }
      if (typeof preload.href === 'string' && preload.href.length > 0) {
        preloadHrefs.push(preload.href);
      }
    }
    failures.push(...collectDuplicateFailures(preloadHrefs, 'head.preloads href'));
  }

  if (!Array.isArray(head.scripts)) {
    failures.push('head.scripts must be an array');
  } else {
    const scriptKeys = [];
    for (let index = 0; index < head.scripts.length; index += 1) {
      const script = head.scripts[index];
      if (!assertObject(script, `head.scripts[${index}]`, failures)) {
        continue;
      }
      if (typeof script.src !== 'string' || script.src.length === 0) {
        failures.push(`head.scripts[${index}].src must be a non-empty string`);
        continue;
      }
      const scriptType = typeof script.type === 'string' ? script.type : '';
      scriptKeys.push(`${scriptType}|${script.src}`);
    }
    failures.push(...collectDuplicateFailures(scriptKeys, 'head.scripts'));
  }

  if (!assertObject(head.rust_link, 'head.rust_link', failures)) {
    // handled above
  } else {
    for (const key of ['href', 'data-target-name', 'data-wasm-opt', 'data-bindgen-target']) {
      if (typeof head.rust_link[key] !== 'string' || head.rust_link[key].length === 0) {
        failures.push(`head.rust_link.${key} must be a non-empty string`);
      }
    }
  }

  if (typeof head.title !== 'string' || head.title.length === 0) {
    failures.push('head.title must be a non-empty string');
  }

  for (const key of ['order', 'comments', 'standard_body_comments', 'intermediary']) {
    if (!keyExists(panels, key)) {
      failures.push(`panels missing key: ${key}`);
    }
  }

  const panelOrder = panels.order;
  if (assertStringArray(panelOrder, 'panels.order', failures)) {
    failures.push(...collectDuplicateFailures(panelOrder, 'panels.order'));
  }

  if (!assertObject(panels.comments, 'panels.comments', failures)) {
    // handled above
  }
  if (!assertObject(panels.standard_body_comments, 'panels.standard_body_comments', failures)) {
    // handled above
  }
  if (!assertObject(panels.intermediary, 'panels.intermediary', failures)) {
    // handled above
  }

  const panelsFromRegistryOrder = (panelsConfig?.panels ?? [])
    .map((panel) => panel?.id)
    .filter((panelId) => typeof panelId === 'string' && panelId !== 'home-scene');

  const orderMismatch =
    !Array.isArray(panelOrder) ||
    panelsFromRegistryOrder.length !== panelOrder.length ||
    panelsFromRegistryOrder.some((panelId, index) => panelOrder[index] !== panelId);

  if (orderMismatch) {
    failures.push(
      `panels.order must exactly match config/panels.json order (excluding home-scene) expected=${JSON.stringify(panelsFromRegistryOrder)} actual=${JSON.stringify(panelOrder)}`,
    );
  }

  const knownPanels = new Set(Array.isArray(panelOrder) ? panelOrder : []);
  if (Array.isArray(home.buttons)) {
    for (let index = 0; index < home.buttons.length; index += 1) {
      const panelTarget = home.buttons[index]?.panel;
      if (typeof panelTarget === 'string' && !knownPanels.has(panelTarget)) {
        failures.push(`home.buttons[${index}] targets unknown panel: ${panelTarget}`);
      }
    }
  }

  if (panels.comments && typeof panels.comments === 'object') {
    for (const panelId of knownPanels) {
      if (typeof panels.comments[panelId] !== 'string' || panels.comments[panelId].length === 0) {
        failures.push(`panels.comments missing non-empty comment for ${panelId}`);
      }
    }
  }

  if (panels.intermediary && typeof panels.intermediary === 'object') {
    for (const [panelId, intermediary] of Object.entries(panels.intermediary)) {
      if (!knownPanels.has(panelId)) {
        failures.push(`panels.intermediary contains unknown panel key: ${panelId}`);
        continue;
      }
      if (!assertObject(intermediary, `panels.intermediary.${panelId}`, failures)) {
        continue;
      }
      if (!Array.isArray(intermediary.entries)) {
        failures.push(`panels.intermediary.${panelId}.entries must be an array`);
        continue;
      }

      const seenTargets = new Set();
      for (let index = 0; index < intermediary.entries.length; index += 1) {
        const entry = intermediary.entries[index];
        if (!assertObject(entry, `panels.intermediary.${panelId}.entries[${index}]`, failures)) {
          continue;
        }

        for (const key of ['panel', 'aria', 'img', 'alt', 'label']) {
          if (typeof entry[key] !== 'string' || entry[key].length === 0) {
            failures.push(`panels.intermediary.${panelId}.entries[${index}].${key} must be a non-empty string`);
          }
        }

        if (typeof entry.panel === 'string') {
          if (!knownPanels.has(entry.panel)) {
            failures.push(`panels.intermediary.${panelId}.entries[${index}] targets unknown panel: ${entry.panel}`);
          }

          if (seenTargets.has(entry.panel)) {
            failures.push(`panels.intermediary.${panelId}.entries duplicate target panel: ${entry.panel}`);
          }
          seenTargets.add(entry.panel);
        }
      }
    }
  }

  const contractInvariants = qa.contract_invariants;
  failures.push(...collectContractInvariantCoverageFailures(contractInvariants));

  if (Array.isArray(contractInvariants)) {
    for (const invariant of contractInvariants) {
      if (!invariant || typeof invariant !== 'object') {
        continue;
      }
      if (typeof invariant.gate === 'string' && !ALLOWED_CONTRACT_GATES.has(invariant.gate)) {
        failures.push(`qa.contract_invariants invalid gate type: ${invariant.gate}`);
      }
    }

    if (contractInvariants.length < REQUIRED_CONTRACT_INVARIANT_IDS.length) {
      failures.push(
        `qa.contract_invariants must include at least ${REQUIRED_CONTRACT_INVARIANT_IDS.length} invariants; actual=${contractInvariants.length}`,
      );
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-index-shell-config] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `[qa-index-shell-config] PASS panels=${panelOrder.length} homeButtons=${home.buttons.length} invariants=${contractInvariants.length} preloads=${head.preloads.length} scripts=${head.scripts.length}`,
  );
}

main().catch((error) => {
  console.error(`[qa-index-shell-config] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
