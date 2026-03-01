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
const launcherPath = path.join(vegasDir, 'run-speakeasy-v9-default.sh');

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

async function listRunDirs(outputBaseDir) {
  const entries = await fs.readdir(outputBaseDir);
  return entries
    .filter((name) => name.startsWith('speakeasy-safe-fallback-'))
    .sort();
}

async function loadSummary(runDir) {
  const summaryPath = path.join(runDir, 'summary.json');
  const summaryRaw = await fs.readFile(summaryPath, 'utf8');
  return JSON.parse(summaryRaw);
}

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'speakeasy-e2e-launcher-'));
const outputBase = path.join(tempRoot, 'output');
const fixturesDir = path.join(tempRoot, 'fixtures');
const referenceImage = path.join(fixturesDir, 'reference.png');
await fs.mkdir(outputBase, { recursive: true });
await fs.mkdir(fixturesDir, { recursive: true });
await fs.writeFile(referenceImage, Buffer.from(referencePngBase64, 'base64'));

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

const mockScorerPayload = JSON.stringify({
  scores: {
    identity: 9.9,
    gaze: 9.9,
    attireReplacement: 9.9,
    edge: 9.9,
    realism: 9.9,
    physics: 9.9,
    sceneAdherence: 9.9,
    poseAdherence: 9.9
  },
  physicsChecklist: {
    supportContact: 9.7,
    nonPenetration: 9.7,
    gravityDrape: 9.7,
    lightShadowGeometry: 9.7,
    materialResponse: 9.7
  },
  diagnostics: 'Mock strict launcher pass.',
  rescueDirectives: ['none'],
  confidence: 0.99
});

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
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: mockScorerPayload }]
            }
          }
        ]
      })
    );
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
    IMAGE_HTTP_RETRIES: '0',
    PROMPT_NONCE_ENABLED: '1',
    HTTP_CACHE_BYPASS: '0'
  };

  const firstRun = await runCommand(
    launcherPath,
    ['--reference', referenceImage, '--max-prompts', '1', '--strict-mode', 'hard'],
    env
  );
  if (firstRun.code !== 0) {
    throw new Error(
      `Strict launcher smoke run #1 failed with exit ${firstRun.code}\nSTDOUT:\n${firstRun.stdout}\nSTDERR:\n${firstRun.stderr}`
    );
  }

  const runDirsAfterFirst = await listRunDirs(outputBase);
  assert(runDirsAfterFirst.length > 0, 'No run directory created by strict launcher smoke run #1');
  const firstRunDir = path.join(outputBase, runDirsAfterFirst[runDirsAfterFirst.length - 1]);
  const firstSummary = await loadSummary(firstRunDir);
  const firstTotals = firstSummary?.totals || {};
  const firstRunInfo = firstSummary?.runInfo || {};
  const firstPromptHash = firstSummary?.prompts?.[0]?.primaryPromptHash || null;

  const firstAttemptsCount = Number(firstTotals.primarySuccess || 0)
    + Number(firstTotals.safeSuccess || 0)
    + Number(firstTotals.failed || 0);
  assert(Number(firstTotals.prompts) === 1, `Expected 1 prompt in summary #1, got ${firstTotals.prompts}`);
  assert(firstAttemptsCount === 1, `Expected exactly 1 attempted prompt in summary #1, got ${firstAttemptsCount}`);
  assert(Number(firstTotals.primarySuccess || 0) >= 1, 'Expected strict launcher run #1 to produce primary success');
  assert(firstRunInfo.outputDirectory === firstRunDir, 'Expected runInfo.outputDirectory to match run #1 directory');

  const secondRun = await runCommand(
    launcherPath,
    ['--reference', referenceImage, '--max-prompts', '1', '--strict-mode', 'hard'],
    env
  );
  if (secondRun.code !== 0) {
    throw new Error(
      `Strict launcher smoke run #2 failed with exit ${secondRun.code}\nSTDOUT:\n${secondRun.stdout}\nSTDERR:\n${secondRun.stderr}`
    );
  }

  const runDirsAfterSecond = await listRunDirs(outputBase);
  assert(runDirsAfterSecond.length >= 2, `Expected at least 2 run directories, got ${runDirsAfterSecond.length}`);
  const secondRunDir = path.join(outputBase, runDirsAfterSecond[runDirsAfterSecond.length - 1]);
  assert(secondRunDir !== firstRunDir, 'Expected second run to create a new run directory');

  const secondSummary = await loadSummary(secondRunDir);
  const secondTotals = secondSummary?.totals || {};
  const secondRunInfo = secondSummary?.runInfo || {};
  const secondPromptHash = secondSummary?.prompts?.[0]?.primaryPromptHash || null;

  const secondAttemptsCount = Number(secondTotals.primarySuccess || 0)
    + Number(secondTotals.safeSuccess || 0)
    + Number(secondTotals.failed || 0);
  assert(Number(secondTotals.prompts) === 1, `Expected 1 prompt in summary #2, got ${secondTotals.prompts}`);
  assert(secondAttemptsCount === 1, `Expected exactly 1 attempted prompt in summary #2, got ${secondAttemptsCount}`);
  assert(Number(secondTotals.primarySuccess || 0) >= 1, 'Expected strict launcher run #2 to produce primary success');
  assert(secondRunInfo.outputDirectory === secondRunDir, 'Expected runInfo.outputDirectory to match run #2 directory');

  assert(String(firstRunInfo.scorerUnavailablePolicy || '').toLowerCase() === 'hard_fail', 'Expected hard_fail policy (run #1)');
  assert(firstRunInfo.enableQualityGate === true, 'Expected enableQualityGate=true (run #1)');
  assert(firstRunInfo.scorerForceSchema === true, 'Expected scorerForceSchema=true (run #1)');
  assert(firstRunInfo.scorerCompactPrompt === true, 'Expected scorerCompactPrompt=true (run #1)');
  assert(firstRunInfo.physicsChecklistEnforce === true, 'Expected physicsChecklistEnforce=true (run #1)');
  assert(firstRunInfo.skipSafeFallbackOnPrimaryReject === false, 'Expected skipSafeFallbackOnPrimaryReject=false (run #1)');
  assert(firstRunInfo.promptDirectionSupremacyMode === true, 'Expected promptDirectionSupremacyMode=true (run #1)');
  assert(firstRunInfo.rateLimitAdaptiveCooldown === true, 'Expected rateLimitAdaptiveCooldown=true (run #1)');
  assert(Number(firstRunInfo.scorerHeuristicMinFields) === 8, `Expected scorerHeuristicMinFields=8 (run #1), got ${firstRunInfo.scorerHeuristicMinFields}`);
  assert(Number(firstRunInfo.primaryRescueMaxAttempts) === 2, `Expected primaryRescueMaxAttempts=2 (run #1), got ${firstRunInfo.primaryRescueMaxAttempts}`);

  assert(firstRunInfo.runNonce && secondRunInfo.runNonce, 'Expected runNonce to exist in both runs');
  assert(firstRunInfo.runNonce !== secondRunInfo.runNonce, 'Expected unique runNonce per run');
  assert(firstPromptHash && secondPromptHash, 'Expected primary prompt hash in both runs');
  assert(firstPromptHash !== secondPromptHash, 'Expected prompt hash to change across runs (nonce freshness)');
  const firstCreatedMs = Date.parse(firstRunInfo.createdAt || '');
  const secondCreatedMs = Date.parse(secondRunInfo.createdAt || '');
  assert(Number.isFinite(firstCreatedMs) && Number.isFinite(secondCreatedMs), 'Expected valid createdAt timestamps');
  assert(secondCreatedMs >= firstCreatedMs, 'Expected run #2 createdAt to be >= run #1 createdAt');

  assert(mockState.imageCalls >= 1, 'Expected at least one mock image endpoint call');
  assert(mockState.scorerCalls >= 1, 'Expected at least one mock scorer endpoint call');

  console.log('PASS strict launcher E2E smoke: strict-mode flags and fresh-run cache protections are enforced.');
  console.log(`Artifacts: ${firstRunDir}`);
  console.log(`Artifacts: ${secondRunDir}`);
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
