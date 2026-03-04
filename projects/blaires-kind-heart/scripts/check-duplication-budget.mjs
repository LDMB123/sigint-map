#!/usr/bin/env node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();

const SCOPES = {
  rust: {
    pattern: "rust/**/*.rs",
    budget: 4,
    ignore: [
      "rust/*_generated.rs",
      "rust/panel_registry_generated.rs",
      "rust/bindings.rs",
    ],
  },
  bash: {
    pattern: "scripts/**/*.sh",
    budget: 0,
  },
  css: {
    pattern: "src/**/*.css",
    budget: 0,
  },
  scripts: {
    pattern: "scripts/**/*.{js,mjs,ts}",
    budget: 8,
  },
  e2e: {
    pattern: "e2e/**/*.{ts,js}",
    budget: 8,
  },
};

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} ${args.join(' ')} failed (${code})\n${stdout}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function runJscpdForScope(scope, outputDir) {
  const args = [
    "-y",
    "jscpd",
    "--pattern",
    scope.pattern,
    "--reporters",
    "json",
    "--output",
    outputDir,
    "--min-lines",
    "8",
    "--min-tokens",
    "50",
  ];

  for (const ignorePattern of scope.ignore ?? []) {
    args.push("--ignore", ignorePattern);
  }

  await run("npx", args, ROOT);

  const report = JSON.parse(await readFile(path.join(outputDir, "jscpd-report.json"), "utf8"));
  return report?.statistics?.total?.clones ?? 0;
}

async function main() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "bkh-dup-budget-"));

  try {
    const cloneCounts = {};
    for (const [name, scope] of Object.entries(SCOPES)) {
      const scopeOut = path.join(tempRoot, name);
      cloneCounts[name] = await runJscpdForScope(scope, scopeOut);
    }

    const failures = [];
    for (const [name, scope] of Object.entries(SCOPES)) {
      const clones = cloneCounts[name];
      if (clones > scope.budget) {
        failures.push(`${name} clone budget exceeded: ${clones} > ${scope.budget}`);
      }
    }

    if (failures.length > 0) {
      for (const failure of failures) {
        console.error(`[qa-duplication-budget] FAIL ${failure}`);
      }
      process.exit(1);
    }

    const summary = Object.keys(SCOPES)
      .map((name) => `${name}=${cloneCounts[name]}`)
      .join(", ");
    console.log(`[qa-duplication-budget] PASS ${summary}`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[qa-duplication-budget] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
