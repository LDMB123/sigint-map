#!/usr/bin/env node

import net from "node:net";
import process from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_PORT = 4173;
const MAX_SCAN = 25;

function parseIntOr(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function pickPort(preferred, maxScan) {
  for (let offset = 0; offset < maxScan; offset += 1) {
    const candidate = preferred + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `No free localhost ports found in range ${preferred}-${preferred + maxScan - 1}`,
  );
}

async function main() {
  const preferred = parseIntOr(process.env.E2E_PORT, DEFAULT_PORT);
  const maxScan = parseIntOr(process.env.E2E_PORT_SCAN_LIMIT, MAX_SCAN);
  const port = await pickPort(preferred, maxScan);

  if (port !== preferred) {
    // Keep this visible so CI/local failures are easier to diagnose.
    // eslint-disable-next-line no-console
    console.log(`[e2e] Port ${preferred} busy; using ${port}`);
  }

  const playwrightCli =
    process.platform === "win32"
      ? "node_modules/.bin/playwright.cmd"
      : "node_modules/.bin/playwright";

  const child = spawn(playwrightCli, ["test", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_PORT: String(port),
    },
  });

  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(`[e2e] Failed to launch Playwright: ${err.message}`);
    process.exit(1);
  });

  child.on("close", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[e2e] ${err.message}`);
  process.exit(1);
});
