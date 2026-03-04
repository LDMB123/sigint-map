#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const CONFIG_PATH = path.join(ROOT, 'config', 'animation-timings.json');
const RUST_PATH = path.join(ROOT, 'rust', 'animation_timings_generated.rs');
const CSS_PATH = path.join(ROOT, 'src', 'styles', 'generated-animation-timings.css');
const ANIMATIONS_PATH = path.join(ROOT, 'src', 'styles', 'animations.css');
const APP_PATH = path.join(ROOT, 'src', 'styles', 'app.css');
const TRACKER_PATH = path.join(ROOT, 'src', 'styles', 'tracker.css');

function parseRustConstant(source, key) {
  const regex = new RegExp(`${key}\\s*:\\s*i32\\s*=\\s*(\\d+)`);
  const match = source.match(regex);
  return match ? Number(match[1]) : null;
}

function parseCssVar(source, key) {
  const regex = new RegExp(`${key}\\s*:\\s*(\\d+)ms\\s*;`);
  const match = source.match(regex);
  return match ? Number(match[1]) : null;
}

function requireContains(source, pattern, label, failures) {
  if (!pattern.test(source)) {
    failures.push(`${label} is missing expected timing var usage (${pattern})`);
  }
}

async function main() {
  const [configSource, rustSource, cssSource, animationsSource, appSource, trackerSource] = await Promise.all([
    readFile(CONFIG_PATH, 'utf8'),
    readFile(RUST_PATH, 'utf8'),
    readFile(CSS_PATH, 'utf8'),
    readFile(ANIMATIONS_PATH, 'utf8'),
    readFile(APP_PATH, 'utf8'),
    readFile(TRACKER_PATH, 'utf8'),
  ]);

  const config = JSON.parse(configSource);
  const expected = {
    float: Number(config?.timings?.float_heart_removal_ms),
    sparkle: Number(config?.timings?.sparkle_reveal_ms),
    jelly: Number(config?.timings?.jelly_wobble_ms),
  };

  const failures = [];
  for (const [name, value] of Object.entries(expected)) {
    if (!Number.isInteger(value) || value < 50) {
      failures.push(`config.animation-timings: invalid ${name} value (${value})`);
    }
  }

  const rustActual = {
    float: parseRustConstant(rustSource, 'FLOAT_HEART_REMOVAL_MS'),
    sparkle: parseRustConstant(rustSource, 'SPARKLE_REVEAL_MS'),
    jelly: parseRustConstant(rustSource, 'JELLY_WOBBLE_MS'),
  };

  const cssActual = {
    float: parseCssVar(cssSource, '--timing-float-heart-removal'),
    sparkle: parseCssVar(cssSource, '--timing-sparkle-reveal'),
    jelly: parseCssVar(cssSource, '--timing-jelly-wobble'),
  };

  for (const key of ['float', 'sparkle', 'jelly']) {
    if (rustActual[key] !== expected[key]) {
      failures.push(`Rust timing mismatch for ${key}: expected ${expected[key]} got ${rustActual[key]}`);
    }
    if (cssActual[key] !== expected[key]) {
      failures.push(`CSS timing mismatch for ${key}: expected ${expected[key]} got ${cssActual[key]}`);
    }
  }

  requireContains(animationsSource, /sparkle-pop\s+var\(--timing-sparkle-reveal\)/, 'animations.css', failures);
  requireContains(animationsSource, /float-up\s+var\(--timing-float-heart-removal\)/, 'animations.css', failures);
  requireContains(animationsSource, /jelly-wobble\s+var\(--timing-jelly-wobble\)/, 'animations.css', failures);
  requireContains(appSource, /jelly-wobble\s+var\(--timing-jelly-wobble\)/, 'app.css', failures);
  requireContains(trackerSource, /jelly-wobble\s+var\(--timing-jelly-wobble\)/, 'tracker.css', failures);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-animation-timing-sync] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log('[qa-animation-timing-sync] PASS animation timings are synchronized');
}

main().catch((error) => {
  console.error(`[qa-animation-timing-sync] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
