import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const runtimeFiles = [
  'src/legacy/app.js',
  'src/legacy/groundbreaking.js',
  'src/legacy/fusion-center.js',
  'src/legacy/watch-center.js',
  'src/legacy/ops-workbench.js',
  'src/legacy/executive-deck.js',
  'src/legacy/showcase-suite.js',
  'src/legacy/init.js',
];

const failures = [];

for (const relativePath of runtimeFiles) {
  const absolutePath = path.join(ROOT, relativePath);
  const text = await readFile(absolutePath, 'utf8');

  if (/\bconsole\.log\s*\(/.test(text)) {
    failures.push(`${relativePath} contains direct console.log usage.`);
  }

  if (/api\.allorigins\.win|api\.codetabs\.com/.test(text)) {
    failures.push(`${relativePath} still references a legacy public proxy host.`);
  }
}

if (failures.length > 0) {
  console.error('Runtime cleanliness check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Runtime cleanliness check passed (${runtimeFiles.length} files scanned).`);
