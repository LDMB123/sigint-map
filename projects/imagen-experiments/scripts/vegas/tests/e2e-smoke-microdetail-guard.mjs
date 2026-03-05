#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vegasDir = path.resolve(__dirname, '..');
const runnerPath = path.join(vegasDir, 'prompt-packs', 'run_speakeasy_safe_fallback_batch.mjs');

const referencePngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2x0AAAAASUVORK5CYII=';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runCommand(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'speakeasy-e2e-guard-'));
const outputBase = path.join(tempRoot, 'output');
const fixturesDir = path.join(tempRoot, 'fixtures');
const promptFile = path.join(fixturesDir, 'guard-prompts.md');
const referenceImage = path.join(fixturesDir, 'reference.png');
await fs.mkdir(outputBase, { recursive: true });
await fs.mkdir(fixturesDir, { recursive: true });

await fs.writeFile(referenceImage, Buffer.from(referencePngBase64, 'base64'));
await fs.writeFile(
  promptFile,
  [
    '## Prompt 41 - Guard Probe',
    '',
    '### Primary Prompt',
    '',
    'Guard probe primary.',
    '',
    '### Safe Backup Prompt',
    '',
    'Guard probe safe.',
    ''
  ].join('\n'),
  'utf8'
);

let cleanupError = null;
try {
  const env = {
    ...process.env,
    OUTPUT_BASE: outputBase,
    PREFLIGHT_ONLY: '1',
    MAX_PROMPTS: '1',
    EXPECT_MICRODETAIL_PROFILE: '1',
    MICRODETAIL_PROFILE_LOCK: '1',
    MICRO_PHYSICS_LANGUAGE_ENFORCEMENT: '0',
    MICRO_PHYSICS_BANNED_TERMS: 'off',
    PHYSICS_DENSITY_MULTIPLIER: '1',
    PHYSICS_DENSITY_MIN_RATIO: '1'
  };

  const result = await runCommand('node', [runnerPath, promptFile, referenceImage], env);
  assert(result.code !== 0, 'Expected guard probe to fail with non-zero exit code');

  const combined = `${result.stdout}\n${result.stderr}`;
  assert(
    /Microdetail profile invariant check failed/i.test(combined),
    'Expected invariant failure banner in output'
  );
  assert(
    /MICRO_PHYSICS_LANGUAGE_ENFORCEMENT must be enabled/i.test(combined),
    'Expected language enforcement invariant violation in output'
  );
  assert(
    /MICRO_PHYSICS_BANNED_TERMS must not be "off"/i.test(combined),
    'Expected banned-terms invariant violation in output'
  );

  console.log('PASS microdetail guard smoke: invariant violations fail fast as expected.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (process.env.KEEP_E2E_ARTIFACTS !== '1') {
    try {
      await fs.rm(tempRoot, { recursive: true, force: true });
    } catch (error) {
      cleanupError = error;
    }
  }
}

if (cleanupError) {
  console.error(`Warning: failed to clean temp artifacts: ${cleanupError}`);
}
