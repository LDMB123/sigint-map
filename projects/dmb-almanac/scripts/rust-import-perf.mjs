#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_RUNS = 3;
const DEFAULT_TIMEOUT_MS = 240_000;
const DB_NAME = 'dmb-almanac-rs';

function parseArgs(argv) {
  const out = {
    baseUrl: DEFAULT_BASE_URL,
    runs: DEFAULT_RUNS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    outJson: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base-url' && argv[i + 1]) {
      out.baseUrl = argv[++i];
      continue;
    }
    if (arg === '--runs' && argv[i + 1]) {
      out.runs = Number(argv[++i]) || DEFAULT_RUNS;
      continue;
    }
    if (arg === '--timeout-ms' && argv[i + 1]) {
      out.timeoutMs = Number(argv[++i]) || DEFAULT_TIMEOUT_MS;
      continue;
    }
    if (arg === '--out-json' && argv[i + 1]) {
      out.outJson = argv[++i];
      continue;
    }
  }

  if (!Number.isFinite(out.runs) || out.runs < 1) {
    throw new Error(`Invalid --runs value: ${out.runs}`);
  }
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs < 30_000) {
    throw new Error(`Invalid --timeout-ms value: ${out.timeoutMs}`);
  }

  return out;
}

function avg(values) {
  if (!values.length) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function p75(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.75) - 1);
  return sorted[idx];
}

async function loadPlaywright(repoRoot) {
  const localPlaywrightPath = path.join(repoRoot, 'e2e', 'node_modules', 'playwright', 'index.js');
  try {
    await fs.access(localPlaywrightPath);
    return await import(pathToFileURL(localPlaywrightPath).href);
  } catch {
    return await import('playwright');
  }
}

async function hardResetClientState(page) {
  await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (dbName) => {
    const deleteDb = () =>
      new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });

    await deleteDb();

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    localStorage.clear();
    sessionStorage.clear();
  }, DB_NAME);
}

async function driveInteractionProbe(page, state) {
  let tick = 0;
  while (!state.done) {
    try {
      if (tick % 2 === 0) {
        const navSummary = page.locator('.nav-more__summary').first();
        if ((await navSummary.count()) > 0) {
          await navSummary.click({ timeout: 1_000 });
        }
      } else {
        const swDetails = page.locator('summary', { hasText: /SW details/i }).first();
        if ((await swDetails.count()) > 0) {
          await swDetails.click({ timeout: 1_000 });
        }
      }
    } catch {
      // Ignore transient interaction failures while the DOM is updating.
    }
    tick += 1;
    await page.waitForTimeout(350);
  }
}

async function runSingle({ browser, baseUrl, timeoutMs, tuningEnabled }) {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  try {
    await hardResetClientState(page);

    await page.goto('/offline.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate((enabled) => {
      localStorage.setItem('pwa_import_tuning_v2', enabled ? 'true' : 'false');
    }, tuningEnabled);

    const startedAt = Date.now();

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    await page.waitForFunction(() => window.__DMB_HYDRATED === true, undefined, {
      timeout: Math.min(timeoutMs, 60_000),
    });

    const probeState = { done: false };
    const probeTask = driveInteractionProbe(page, probeState);
    try {
      await page.waitForFunction(
        () => {
          const rows = Array.from(document.querySelectorAll('.pwa-status__row'));
          const joined = rows.map((row) => row.textContent ?? '').join(' ');
          return joined.includes('Offline data ready') || joined.includes('Import failed');
        },
        undefined,
        { timeout: timeoutMs }
      );
    } finally {
      probeState.done = true;
      await probeTask;
    }

    const finishedAt = Date.now();
    const statusText = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.pwa-status__row'));
      return rows.map((row) => (row.textContent ?? '').trim()).join(' | ');
    });

    if (statusText.includes('Import failed')) {
      throw new Error(`Import failed with status: ${statusText}`);
    }

    const perf = await page.evaluate(() => {
      const metrics = window.__DMB_PERF_METRICS;
      if (!metrics || typeof metrics.compute !== 'function') {
        return {
          supported: false,
          p75InteractionMs: null,
          longFrameCount: null,
          interactionCount: null,
          sampleSize: null,
        };
      }
      const summary = metrics.compute();
      return {
        supported: !!summary.supported,
        p75InteractionMs:
          typeof summary.p75InteractionMs === 'number' ? summary.p75InteractionMs : null,
        longFrameCount:
          typeof summary.longFrameCount === 'number' ? summary.longFrameCount : null,
        interactionCount:
          typeof summary.interactionCount === 'number' ? summary.interactionCount : null,
        sampleSize: typeof summary.sampleSize === 'number' ? summary.sampleSize : null,
      };
    });

    return {
      tuningEnabled,
      durationMs: finishedAt - startedAt,
      statusText,
      perf,
    };
  } finally {
    await context.close();
  }
}

async function runBucket({ browser, baseUrl, timeoutMs, runs, tuningEnabled }) {
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    // eslint-disable-next-line no-console
    console.log(`run ${i + 1}/${runs} (tuning=${tuningEnabled})`);
    const result = await runSingle({ browser, baseUrl, timeoutMs, tuningEnabled });
    samples.push(result);
  }

  const durations = samples.map((s) => s.durationMs);
  const p75Interactions = samples
    .map((s) => s.perf.p75InteractionMs)
    .filter((v) => typeof v === 'number');
  const longFrames = samples
    .map((s) => s.perf.longFrameCount)
    .filter((v) => typeof v === 'number');

  return {
    tuningEnabled,
    runs,
    avgDurationMs: avg(durations),
    p75DurationMs: p75(durations),
    avgP75InteractionMs: avg(p75Interactions),
    avgLongFrameCount: avg(longFrames),
    samples,
  };
}

function printSummary(bucket) {
  const label = bucket.tuningEnabled ? 'tuning=true' : 'tuning=false';
  // eslint-disable-next-line no-console
  console.log(`\n${label}`);
  // eslint-disable-next-line no-console
  console.log(`  avg duration ms: ${bucket.avgDurationMs?.toFixed(1) ?? 'n/a'}`);
  // eslint-disable-next-line no-console
  console.log(`  p75 duration ms: ${bucket.p75DurationMs?.toFixed(1) ?? 'n/a'}`);
  // eslint-disable-next-line no-console
  console.log(`  avg p75 interaction ms: ${bucket.avgP75InteractionMs?.toFixed(1) ?? 'n/a'}`);
  // eslint-disable-next-line no-console
  console.log(`  avg long frame count: ${bucket.avgLongFrameCount?.toFixed(1) ?? 'n/a'}`);
}

async function main() {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const options = parseArgs(process.argv.slice(2));
  const playwright = await loadPlaywright(repoRoot);
  const chromium = playwright?.chromium ?? playwright?.default?.chromium;
  if (!chromium || typeof chromium.launch !== 'function') {
    throw new Error('Unable to resolve Playwright chromium launcher');
  }
  const browser = await chromium.launch({ headless: true });

  try {
    const baseline = await runBucket({
      browser,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      runs: options.runs,
      tuningEnabled: false,
    });
    const tuned = await runBucket({
      browser,
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs,
      runs: options.runs,
      tuningEnabled: true,
    });

    const output = {
      generatedAt: new Date().toISOString(),
      baseUrl: options.baseUrl,
      runs: options.runs,
      timeoutMs: options.timeoutMs,
      baseline,
      tuned,
    };

    printSummary(baseline);
    printSummary(tuned);

    if (options.outJson) {
      const outPath = path.resolve(options.outJson);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`\nwrote ${outPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
