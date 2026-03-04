#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const E2E_DIR = path.join(ROOT_DIR, 'e2e');
const WAIVER_PATH = path.join(ROOT_DIR, 'config', 'e2e-skip-waivers.json');

function rel(filePath) {
  return path.relative(ROOT_DIR, filePath).replaceAll('\\', '/');
}

async function listSpecFiles() {
  const entries = await readdir(E2E_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => path.join(E2E_DIR, entry.name))
    .sort();
}

function findSkipLines(source) {
  const lines = source.split(/\r?\n/);
  const skips = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('test.skip(') || line.includes('.skip(')) {
      skips.push({ line: i + 1, text: line.trim() });
    }
  }
  return skips;
}

async function main() {
  const waivers = JSON.parse(await readFile(WAIVER_PATH, 'utf8'));
  if (!Array.isArray(waivers.allowed_skips)) {
    throw new Error('config/e2e-skip-waivers.json must include allowed_skips[]');
  }

  const specFiles = await listSpecFiles();
  const skipUsages = [];

  for (const specFile of specFiles) {
    const source = await readFile(specFile, 'utf8');
    for (const skip of findSkipLines(source)) {
      skipUsages.push({ file: rel(specFile), ...skip });
    }
  }

  const failures = [];

  for (const usage of skipUsages) {
    const matched = waivers.allowed_skips.some(
      (waiver) => waiver.file === usage.file && usage.text.includes(waiver.match),
    );
    if (!matched) {
      failures.push(
        `${usage.file}:${usage.line} has unwaived skip: ${usage.text}`,
      );
    }
  }

  for (const waiver of waivers.allowed_skips) {
    const used = skipUsages.some(
      (usage) => usage.file === waiver.file && usage.text.includes(waiver.match),
    );
    if (!used) {
      failures.push(`stale waiver: ${waiver.file} match="${waiver.match}"`);
    }
  }

  if (failures.length > 0) {
    console.error('❌ E2E skip waiver check failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(`✅ E2E skip waiver check passed (skips=${skipUsages.length})`);
}

main().catch((error) => {
  console.error(`❌ E2E skip waiver check crashed: ${error?.stack || error}`);
  process.exit(1);
});
