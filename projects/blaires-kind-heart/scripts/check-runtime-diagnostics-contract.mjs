import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const CONTRACTS = [
  {
    file: "wasm-init.js",
    patterns: [
      { regex: /import '\.\/runtime-diagnostics\.js';/, description: "imports runtime diagnostics" },
      { regex: /__BKH_RUNTIME_DIAGNOSTICS__\?\.install\(\{/, description: "installs runtime diagnostics" },
      { regex: /scope:\s*'wasm-init'/, description: "uses wasm-init scope" },
      { regex: /captureInp:\s*true/, description: "enables INP diagnostics" },
      { regex: /captureLoaf:\s*true/, description: "enables LoAF diagnostics" },
    ],
  },
  {
    file: "public/sw.js",
    patterns: [
      {
        regex: /importScripts\("\.\/runtime-diagnostics\.js"\);/,
        description: "loads runtime diagnostics in service worker",
      },
      { regex: /scope:\s*"sw"/, description: "uses service worker scope" },
    ],
  },
  {
    file: "public/db-worker.js",
    patterns: [
      {
        regex: /import "\.\/runtime-diagnostics\.js";/,
        description: "loads runtime diagnostics in DB worker",
      },
      { regex: /scope:\s*"db-worker"/, description: "uses db-worker scope" },
    ],
  },
  {
    file: "public/sw-assets.js",
    patterns: [
      {
        regex: /['"]\/runtime-diagnostics\.js['"]/,
        description: "precaches runtime-diagnostics.js",
      },
    ],
  },
  {
    file: "index.html",
    patterns: [
      {
        regex: /href="public\/runtime-diagnostics\.js"/,
        description: "copies runtime diagnostics into dist root",
      },
    ],
  },
  {
    file: "public/runtime-diagnostics.js",
    patterns: [
      {
        regex: /__BKH_RUNTIME_DIAGNOSTICS__/,
        description: "exports global diagnostics API",
      },
      {
        regex: /function installRuntimeDiagnostics\(options\)/,
        description: "defines install entrypoint",
      },
      {
        regex: /"inp-observer"/,
        description: "emits INP observer status event",
      },
      {
        regex: /"loaf-observer"/,
        description: "emits LoAF observer status event",
      },
      {
        regex: /function collectNativeCapabilities\(.*\)/,
        description: "collects native capability snapshot",
      },
      {
        regex: /capabilities:\s*collectNativeCapabilities\(\)/,
        description: "records capability snapshot on install",
      },
    ],
  },
];

async function readText(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  return readFile(fullPath, "utf8");
}

async function main() {
  const failures = [];

  for (const contract of CONTRACTS) {
    const source = await readText(contract.file);
    for (const pattern of contract.patterns) {
      if (!pattern.regex.test(source)) {
        failures.push(
          `${contract.file}: missing ${pattern.description} (${pattern.regex.toString()})`,
        );
      }
    }
  }

  const runtimeDiagnosticsSource = await readText("public/runtime-diagnostics.js");
  if (/userAgent/.test(runtimeDiagnosticsSource)) {
    failures.push(
      "public/runtime-diagnostics.js: userAgent logging is not allowed in runtime diagnostics",
    );
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[qa-runtime] FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("[qa-runtime] PASS runtime diagnostics contract checks");
}

main().catch((error) => {
  console.error(`[qa-runtime] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
