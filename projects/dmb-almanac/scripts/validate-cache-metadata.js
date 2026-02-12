import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const metadataPath = path.join(root, '.claude', 'cache-metadata.json');

function fail(message) {
  console.error(`cache-metadata: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(metadataPath)) {
  fail('missing .claude/cache-metadata.json');
}

let metadata;
try {
  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON (${error.message})`);
}

const warmOnSessionStart = Array.isArray(metadata.warmOnSessionStart)
  ? metadata.warmOnSessionStart
  : [];

if (!warmOnSessionStart.length) {
  console.warn('cache-metadata: warmOnSessionStart is empty');
}

const seen = new Set();
const duplicates = [];
const missing = [];
const invalid = [];

for (const entry of warmOnSessionStart) {
  if (typeof entry !== 'string' || !entry.trim()) {
    invalid.push(entry);
    continue;
  }

  if (seen.has(entry)) {
    duplicates.push(entry);
  } else {
    seen.add(entry);
  }

  const fullPath = path.resolve(root, entry);
  if (!fs.existsSync(fullPath)) {
    missing.push(entry);
  }
}

if (invalid.length) {
  console.error('cache-metadata: invalid warmOnSessionStart entries:');
  for (const entry of invalid) {
    console.error(`- ${String(entry)}`);
  }
  process.exit(1);
}

if (missing.length) {
  console.error('cache-metadata: missing files:');
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}

if (duplicates.length) {
  console.warn('cache-metadata: duplicate entries:');
  for (const entry of duplicates) {
    console.warn(`- ${entry}`);
  }
}

const dataBundleReferencePath = path.resolve(root, 'docs/references/DATA_BUNDLE_REFERENCE.md');
const bundlePath = path.resolve(root, 'data/static-data/bundle.json');
const indexPath = path.resolve(root, 'data/static-data/index.json');

function extractReferenceVersion(contents) {
  const match = contents.match(/Version\*\*:.*?(\d{4}-\d{2}-\d{2})/i);
  return match ? match[1] : null;
}

try {
  if (fs.existsSync(dataBundleReferencePath) && fs.existsSync(bundlePath) && fs.existsSync(indexPath)) {
    const referenceContents = fs.readFileSync(dataBundleReferencePath, 'utf8');
    const referenceVersion = extractReferenceVersion(referenceContents);
    if (!referenceVersion) {
      console.warn('cache-metadata: could not parse DATA_BUNDLE_REFERENCE version');
    } else {
      const bundleVersion = JSON.parse(fs.readFileSync(bundlePath, 'utf8')).version;
      const indexVersion = JSON.parse(fs.readFileSync(indexPath, 'utf8')).version;
      if (bundleVersion && indexVersion && bundleVersion !== indexVersion) {
        console.warn(`cache-metadata: bundle/index version mismatch (${bundleVersion} vs ${indexVersion})`);
      }
      if (bundleVersion && bundleVersion !== referenceVersion) {
        console.warn(`cache-metadata: DATA_BUNDLE_REFERENCE version (${referenceVersion}) differs from bundle (${bundleVersion})`);
      }
      if (indexVersion && indexVersion !== referenceVersion) {
        console.warn(`cache-metadata: DATA_BUNDLE_REFERENCE version (${referenceVersion}) differs from index (${indexVersion})`);
      }
    }
  }
} catch (error) {
  console.warn(`cache-metadata: version check failed (${error.message})`);
}

console.log(`cache-metadata: ok (${warmOnSessionStart.length} warm items, ${missing.length} missing)`);
