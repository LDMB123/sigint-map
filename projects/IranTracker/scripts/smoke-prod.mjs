import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.SMOKE_PORT || 3210);
const HOST = '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { response, text, json };
}

async function waitForServer(logs, readyRef, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (readyRef.ready) return;
    await delay(250);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms.\n\n${logs.join('')}`);
}

const logs = [];
const readyRef = { ready: false };

const child = spawn(
  process.execPath,
  [NEXT_BIN, 'start', '--hostname', HOST, '--port', String(PORT)],
  {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

function onData(chunk) {
  const text = chunk.toString();
  logs.push(text);
  if (text.includes('Ready in') || text.includes(`http://${HOST}:${PORT}`)) {
    readyRef.ready = true;
  }
}

child.stdout.on('data', onData);
child.stderr.on('data', onData);
child.on('error', (error) => {
  logs.push(String(error));
});

function cleanupChild() {
  try {
    child.kill('SIGTERM');
  } catch {}

  setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {}
  }, 2000).unref();

  child.stdout?.destroy();
  child.stderr?.destroy();
}

try {
  await waitForServer(logs, readyRef);

  const home = await fetch(`${BASE_URL}/`);
  const homeHtml = await home.text();

  if (!home.ok) {
    throw new Error(`Expected GET / to return 200, got ${home.status}`);
  }

  const requiredMarkers = ['legacy-dashboard-root', 'loading-screen', 'SIGINT-MAP'];
  for (const marker of requiredMarkers) {
    if (!homeHtml.includes(marker)) {
      throw new Error(`GET / did not include required marker: ${marker}`);
    }
  }

  const proxyMissing = await fetchJson(`${BASE_URL}/api/proxy`);
  if (proxyMissing.response.status !== 400 || proxyMissing.json?.error !== 'Missing url parameter.') {
    throw new Error(`Unexpected /api/proxy missing-url response: ${proxyMissing.text}`);
  }

  const proxyBlocked = await fetchJson(
    `${BASE_URL}/api/proxy?url=${encodeURIComponent('https://example.com')}`,
  );
  if (proxyBlocked.response.status !== 403) {
    throw new Error(`Unexpected /api/proxy blocked-host response: ${proxyBlocked.text}`);
  }

  const proxyBadPort = await fetchJson(
    `${BASE_URL}/api/proxy?url=${encodeURIComponent('https://api.open-meteo.com:444/test')}`,
  );
  if (proxyBadPort.response.status !== 400) {
    throw new Error(`Unexpected /api/proxy blocked-port response: ${proxyBadPort.text}`);
  }

  const allOriginsMissing = await fetchJson(`${BASE_URL}/api/allorigins-get`);
  if (allOriginsMissing.response.status !== 400 || allOriginsMissing.json?.error !== 'Missing url parameter.') {
    throw new Error(`Unexpected /api/allorigins-get missing-url response: ${allOriginsMissing.text}`);
  }

  const firms = await fetchJson(`${BASE_URL}/api/firms`);
  if (process.env.FIRMS_API_KEY) {
    if (![200, 502, 504].includes(firms.response.status)) {
      throw new Error(`Unexpected /api/firms response with FIRMS_API_KEY set: ${firms.text}`);
    }
  } else if (
    firms.response.status !== 503 ||
    firms.json?.error !== 'FIRMS_API_KEY is not configured on the server.'
  ) {
    throw new Error(`Unexpected /api/firms missing-env response: ${firms.text}`);
  }

  const openRadiation = await fetchJson(`${BASE_URL}/api/openradiation`);
  if (process.env.OPENRADIATION_API_KEY) {
    if (![200, 502, 504].includes(openRadiation.response.status)) {
      throw new Error(`Unexpected /api/openradiation response with OPENRADIATION_API_KEY set: ${openRadiation.text}`);
    }
  } else if (
    openRadiation.response.status !== 503 ||
    openRadiation.json?.error !== 'OPENRADIATION_API_KEY is not configured on the server.'
  ) {
    throw new Error(`Unexpected /api/openradiation missing-env response: ${openRadiation.text}`);
  }

  console.log('Production smoke test passed.');
} finally {
  cleanupChild();
}
