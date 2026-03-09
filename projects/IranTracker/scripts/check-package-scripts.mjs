import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const packageJsonPath = path.join(ROOT, 'package.json');
const smokePath = path.join(ROOT, 'scripts', 'smoke-prod.mjs');

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const smokeText = await readFile(smokePath, 'utf8');

const expectedScripts = {
  dev: /^node \.\/node_modules\/next\/dist\/bin\/next dev --webpack$/,
  build: /^node \.\/node_modules\/next\/dist\/bin\/next build --webpack$/,
  start: /^node \.\/node_modules\/next\/dist\/bin\/next start$/,
};

const failures = [];
for (const [key, pattern] of Object.entries(expectedScripts)) {
  const value = packageJson.scripts?.[key] || '';
  if (!pattern.test(value)) {
    failures.push(`package.json script "${key}" must use the local Next binary: ${pattern}`);
  }
}

if (/\bnpx\b/.test(smokeText)) {
  failures.push('scripts/smoke-prod.mjs should not use npx for Next startup.');
}

const resolvesNextBin = (
  /\bNEXT_BIN\b/.test(smokeText)
  && smokeText.includes("'node_modules'")
  && smokeText.includes("'next'")
  && smokeText.includes("'dist'")
  && smokeText.includes("'bin'")
);
if (!resolvesNextBin) {
  failures.push('scripts/smoke-prod.mjs must resolve the local Next binary directly.');
}

if (failures.length) {
  console.error('Package script validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Package script validation passed.');
