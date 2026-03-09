import { readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const modules = [
  'src/legacy/groundbreaking.js',
  'src/legacy/fusion-center.js',
  'src/legacy/executive-deck.js',
  'src/legacy/ops-workbench.js',
  'src/legacy/watch-center.js',
  'src/legacy/showcase-suite.js',
];

const sharedHelpers = [
  'escapeHtml',
  'readStoredJson',
  'writeStoredJson',
  'readStoredFlag',
  'writeStoredFlag',
  'readStoredString',
  'writeStoredString',
  'formatAge',
  'formatCoords',
  'haversineKm',
  'copyText',
  'downloadTextFile',
  'debounce',
  'createCleanupBucket',
  'clamp',
  'dispatchSigintEvent',
  'setInnerHtmlIfChanged',
  'setTextContentIfChanged',
  'stableSerialize',
];

const failures = [];

for (const relativePath of modules) {
  const absolutePath = path.join(projectRoot, relativePath);
  const text = await readFile(absolutePath, 'utf8');

  if (!/from '\.\/shared-utils\.js';/.test(text)) {
    failures.push(`${relativePath}: missing shared-utils import`);
  }

  sharedHelpers.forEach((helper) => {
    const pattern = new RegExp(`(?:function|const|let|var)\\s+${helper}\\b`);
    if (pattern.test(text)) {
      failures.push(`${relativePath}: local helper still declared → ${helper}`);
    }
  });
}

const sharedUtilsPath = path.join(projectRoot, 'src', 'legacy', 'shared-utils.js');
const sharedUtilsText = await readFile(sharedUtilsPath, 'utf8');
sharedHelpers.forEach((helper) => {
  if (!new RegExp(`export function ${helper}\\b`).test(sharedUtilsText)) {
    failures.push(`src/legacy/shared-utils.js: missing export ${helper}`);
  }
});

if (failures.length) {
  console.error('Shared utility check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Shared utility check passed (${modules.length} modules normalized).`);
