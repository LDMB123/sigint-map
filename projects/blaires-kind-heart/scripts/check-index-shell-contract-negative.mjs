#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  collectIndexShellContractFailures,
  loadContractInvariantsFromIndexShellConfig,
  loadHomeButtonsFromIndexShellConfig,
  loadPanelIdsFromPanelsConfig,
} from './check-index-shell-contract.mjs';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');

const MUTATION_CASES = [
  {
    id: 'missing-head-marker-start',
    mutate: (source) => source.replace('<!-- INDEX-SHELL HEAD START -->', ''),
    expectedFailureSubstring: 'index head marker start',
  },
  {
    id: 'missing-home-marker-start',
    mutate: (source) => source.replace('<!-- INDEX-SHELL HOME BUTTONS START -->', ''),
    expectedFailureSubstring: 'index home marker start',
  },
  {
    id: 'missing-panel-data-panel-id',
    mutate: (source) =>
      source.replace(
        /(<section[^>]*\bid="panel-games"[^>]*?)\sdata-panel-id="panel-games"/i,
        '$1',
      ),
    expectedFailureSubstring: 'panel-games: missing panel section contract',
  },
  {
    id: 'missing-data-panel-open-target',
    mutate: (source) => source.replace('data-panel-open="panel-adventures"', 'data-panel-open="panel-adventures-broken"'),
    expectedFailureSubstring: 'missing data-panel-open trigger for panel-adventures',
  },
  {
    id: 'missing-home-breadcrumb-template',
    mutate: (source) =>
      source.replace(
        /<template[^>]*\bid="breadcrumb-home-template"[^>]*>[\s\S]*?<\/template>/i,
        '<!-- breadcrumb-home-template removed for negative contract check -->',
      ),
    expectedFailureSubstring: 'home breadcrumb template',
  },
  {
    id: 'missing-home-entrypoint-target',
    mutate: (source) =>
      source.replace(
        /(<button[^>]*\bdata-panel-open="panel-tracker"[^>]*?)\sdata-home-btn\b/i,
        '$1',
      ),
    expectedFailureSubstring: 'missing top-level home entrypoint for panel-tracker',
  },
];

async function main() {
  const [indexHtml, panelIds, contractInvariants, homeButtons] = await Promise.all([
    readFile(INDEX_PATH, 'utf8'),
    loadPanelIdsFromPanelsConfig(),
    loadContractInvariantsFromIndexShellConfig(),
    loadHomeButtonsFromIndexShellConfig(),
  ]);

  const failures = [];

  for (const mutationCase of MUTATION_CASES) {
    const mutatedHtml = mutationCase.mutate(indexHtml);
    if (mutatedHtml === indexHtml) {
      failures.push(`${mutationCase.id}: mutation did not alter input`);
      continue;
    }

    const contractFailures = collectIndexShellContractFailures(
      mutatedHtml,
      panelIds,
      contractInvariants,
      homeButtons,
    );
    if (contractFailures.length === 0) {
      failures.push(`${mutationCase.id}: expected at least one contract failure after mutation`);
      continue;
    }

    const matchedExpectedFailure = contractFailures.some((failure) =>
      failure.includes(mutationCase.expectedFailureSubstring),
    );

    if (!matchedExpectedFailure) {
      failures.push(
        `${mutationCase.id}: failures did not include expected marker "${mutationCase.expectedFailureSubstring}" (actual=${JSON.stringify(contractFailures)})`,
      );
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-index-shell-contract-negative] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log(`[qa-index-shell-contract-negative] PASS cases=${MUTATION_CASES.length}`);
}

main().catch((error) => {
  console.error(`[qa-index-shell-contract-negative] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
