#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const DEFAULT_BASE = '/Users/louisherman/nanobanana-output/projects/live-batches';
const baseDir = path.resolve(process.argv[2] || DEFAULT_BASE);

async function listDirs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => path.join(dir, entry.name));
}

async function collectRunDirs(root) {
  const firstLevel = await listDirs(root);
  const maybeRuns = [];

  for (const dir of firstLevel) {
    if (path.basename(dir).startsWith('speakeasy-safe-fallback-')) {
      maybeRuns.push(dir);
      continue;
    }
    const nested = await listDirs(dir).catch(() => []);
    for (const child of nested) {
      if (path.basename(child).startsWith('speakeasy-safe-fallback-')) {
        maybeRuns.push(child);
      }
    }
  }
  return maybeRuns;
}

function isCompleteSummary(summary) {
  const expected = Number(summary?.totals?.prompts || 0);
  const actual = Array.isArray(summary?.prompts) ? summary.prompts.length : 0;
  if (expected <= 0) return false;
  const status = String(summary?.runState?.status || '').toLowerCase();
  if (status) {
    return expected === actual && status === 'completed';
  }
  return expected === actual;
}

async function main() {
  const runDirs = await collectRunDirs(baseDir);
  if (!runDirs.length) {
    console.log(`No run directories found under: ${baseDir}`);
    process.exit(1);
  }

  const reports = [];
  for (const runDir of runDirs) {
    const summaryPath = path.join(runDir, 'summary.json');
    try {
      const raw = await fs.readFile(summaryPath, 'utf8');
      const summary = JSON.parse(raw);
      reports.push({
        runDir,
        summaryPath,
        createdAt: summary?.runInfo?.createdAt || null,
        runStatus: summary?.runState?.status || null,
        complete: isCompleteSummary(summary),
        expectedPrompts: Number(summary?.totals?.prompts || 0),
        actualPrompts: Array.isArray(summary?.prompts) ? summary.prompts.length : 0
      });
    } catch {
      // Ignore directories without parseable summaries.
    }
  }

  if (!reports.length) {
    console.log(`No parseable summary.json files found under: ${baseDir}`);
    process.exit(1);
  }

  reports.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const latestAny = reports[reports.length - 1];
  const complete = reports.filter(item => item.complete);
  const latestComplete = complete.length ? complete[complete.length - 1] : null;

  console.log(`Base: ${baseDir}`);
  console.log(`Total runs with summaries: ${reports.length}`);
  console.log(`Complete runs: ${complete.length}`);
  console.log(`Latest run: ${latestAny.runDir}`);
  console.log(`Latest run status: ${latestAny.runStatus || 'unknown'}`);
  console.log(
    `Latest run completeness: ${latestAny.complete ? 'complete' : `partial (${latestAny.actualPrompts}/${latestAny.expectedPrompts})`}`
  );
  if (latestComplete) {
    console.log(`Latest complete run: ${latestComplete.runDir}`);
    console.log(`Latest complete summary: ${latestComplete.summaryPath}`);
  } else {
    console.log('Latest complete run: none found');
    process.exit(2);
  }
}

main().catch(error => {
  console.error(`Failed: ${error?.message || error}`);
  process.exit(1);
});
