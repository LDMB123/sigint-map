#!/usr/bin/env node

import http from 'node:http';
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

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'speakeasy-e2e-hardfail-'));
const outputBase = path.join(tempRoot, 'output');
const fixturesDir = path.join(tempRoot, 'fixtures');
const promptFile = path.join(fixturesDir, 'mock-prompts.md');
const referenceImage = path.join(fixturesDir, 'reference.png');
await fs.mkdir(outputBase, { recursive: true });
await fs.mkdir(fixturesDir, { recursive: true });

await fs.writeFile(referenceImage, Buffer.from(referencePngBase64, 'base64'));
await fs.writeFile(
  promptFile,
  [
    '## Prompt 81 - Hardfail Smoke Prompt',
    '',
    '### Primary Prompt',
    '',
    'Intimate luxury suite setting. Two-piece lace "evening-gown" sexy attire (not evening wear).',
    '',
    '### Safe Backup Prompt',
    '',
    'Intimate luxury suite setting. Two-piece lace "evening-gown" sexy attire (not evening wear).',
    ''
  ].join('\n'),
  'utf8'
);

const mockState = {
  imageCalls: 0,
  scorerCalls: 0
};

const mockImageResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: referencePngBase64
            }
          }
        ]
      }
    }
  ]
};

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  if (req.url === '/image') {
    mockState.imageCalls += 1;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(mockImageResponse));
    return;
  }

  if (req.url === '/scorer') {
    mockState.scorerCalls += 1;
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'scorer unavailable (intentional e2e hard-fail test)' }));
    return;
  }

  res.writeHead(404).end();
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
assert(port > 0, 'Mock server failed to bind to a port');

let cleanupError = null;
try {
  const env = {
    ...process.env,
    IMAGE_ENDPOINT: `http://127.0.0.1:${port}/image`,
    SCORER_ENDPOINT: `http://127.0.0.1:${port}/scorer`,
    STATIC_ACCESS_TOKEN: 'mock-e2e-token',
    OUTPUT_BASE: outputBase,
    WAIT_BEFORE_ATTEMPT_S: '1',
    REQUEST_TIMEOUT_MS: '30000',
    MAX_PROMPTS: '1',
    IMAGE_HTTP_RETRIES: '0',
    PROMPT_NONCE_ENABLED: '0',
    HTTP_CACHE_BYPASS: '0',
    SCORER_FORCE_SCHEMA: '0',
    SCORER_UNAVAILABLE_POLICY: 'hard_fail',
    SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT: '0'
  };

  const result = await runCommand('node', [runnerPath, promptFile, referenceImage], env);
  if (result.code !== 0) {
    throw new Error(
      `Hard-fail smoke run exited non-zero (${result.code}). Runner should complete with failed summary.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  }

  const runDirs = (await fs.readdir(outputBase))
    .filter((name) => name.startsWith('speakeasy-safe-fallback-'))
    .sort();
  assert(runDirs.length > 0, 'No run directory created by hard-fail smoke run');

  const latestRun = path.join(outputBase, runDirs[runDirs.length - 1]);
  const summaryPath = path.join(latestRun, 'summary.json');
  const summaryRaw = await fs.readFile(summaryPath, 'utf8');
  const summary = JSON.parse(summaryRaw);

  const totals = summary?.totals || {};
  assert(Number(totals.prompts) === 1, `Expected 1 prompt, got ${totals.prompts}`);
  assert(Number(totals.primarySuccess || 0) === 0, `Expected 0 primarySuccess, got ${totals.primarySuccess}`);
  assert(Number(totals.safeSuccess || 0) === 0, `Expected 0 safeSuccess, got ${totals.safeSuccess}`);
  assert(Number(totals.failed || 0) === 1, `Expected failed=1, got ${totals.failed}`);
  assert(Number(totals.qualityScorerUnavailable || 0) >= 1, 'Expected scorerUnavailable counter to be >= 1');
  assert(mockState.imageCalls >= 1, 'Expected at least one image request');
  assert(mockState.scorerCalls >= 1, 'Expected at least one scorer request');

  console.log('PASS scorer hard-fail E2E smoke: unavailable scorer correctly blocks acceptance.');
  console.log(`Artifacts: ${latestRun}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
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

