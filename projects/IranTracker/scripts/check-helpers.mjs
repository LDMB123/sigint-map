import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = path.resolve(process.cwd());

export async function readFiles(relativePathsByKey) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(relativePathsByKey).map(async ([key, relPath]) => [
        key,
        await readFile(path.join(ROOT, relPath), 'utf8'),
      ]),
    ),
  );
}

export function runPatternChecks(label, texts, { required = [], forbidden = [] } = {}) {
  const missing = required.filter(([, key, pattern]) => !pattern.test(texts[key]));
  const present = forbidden.filter(([, key, pattern]) => pattern.test(texts[key]));

  if (missing.length || present.length) {
    console.error(`${label} failed:`);
    missing.forEach(([name]) => console.error(`- missing: ${name}`));
    present.forEach(([name]) => console.error(`- forbidden: ${name}`));
    process.exit(1);
  }

  console.log(`${label} passed (${required.length + forbidden.length} invariants).`);
}

export async function collectFiles(dir, pattern = /\.(js|jsx|mjs)$/) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}
