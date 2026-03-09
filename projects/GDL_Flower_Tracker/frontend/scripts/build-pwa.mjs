import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, posix, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const outDir = join(root, "out");
const publicDir = join(root, "public");
const PRECACHE_EXTENSIONS = new Set([".css", ".html", ".ico", ".js", ".json", ".png", ".svg", ".txt", ".webmanifest", ".woff2"]);

function walkFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function toWebPath(filePath) {
  return `/${posix.join(...relative(outDir, filePath).split(/[/\\]+/))}`;
}

function shouldPrecache(filePath) {
  const webPath = toWebPath(filePath);
  const ext = webPath.includes(".") ? webPath.slice(webPath.lastIndexOf(".")) : "";
  return PRECACHE_EXTENSIONS.has(ext) && !webPath.endsWith(".map");
}

function revisionFor(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").slice(0, 16);
}

function buildPrecacheManifest() {
  return walkFiles(outDir)
    .filter(shouldPrecache)
    .map((filePath) => ({
      url: toWebPath(filePath),
      revision: revisionFor(filePath),
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

function writeServiceWorker(precacheManifest) {
  const manifestHash = createHash("sha256")
    .update(JSON.stringify(precacheManifest))
    .digest("hex")
    .slice(0, 12);

  const source = `const VERSION = "${manifestHash}";
const PRECACHE = "gdl-precache-" + VERSION;
const DASHBOARD_CACHE = "gdl-dashboard-runtime-" + VERSION;
const STATIC_CACHE = "gdl-static-runtime-" + VERSION;
const OFFLINE_FALLBACK_URL = "/offline.html";
const PRECACHE_ENTRIES = ${JSON.stringify(precacheManifest, null, 2)};
const PRECACHE_URLS = PRECACHE_ENTRIES.map((entry) => entry.url);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    await cache.addAll(PRECACHE_URLS);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((name) => {
        if (
          name.startsWith("gdl-precache-") ||
          name.startsWith("gdl-dashboard-runtime-") ||
          name.startsWith("gdl-static-runtime-")
        ) {
          if (![PRECACHE, DASHBOARD_CACHE, STATIC_CACHE].includes(name)) {
            return caches.delete(name);
          }
        }
        return Promise.resolve(false);
      }),
    );
  })());
});

async function matchPrecache(request) {
  const cache = await caches.open(PRECACHE);
  return cache.match(request, { ignoreSearch: true });
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || matchPrecache(request);
}

async function networkFirst(request) {
  const cache = await caches.open(DASHBOARD_CACHE);
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), 5000);
  });

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  const response = await Promise.race([network, timeout]);
  return response || cache.match(request);
}

async function navigationFallback(request) {
  try {
    return await fetch(request);
  } catch (_error) {
    return (
      (await matchPrecache(request)) ||
      (await matchPrecache("/")) ||
      (await matchPrecache(OFFLINE_FALLBACK_URL))
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && url.pathname === "/api/dashboard") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === "navigate" && sameOrigin && !url.pathname.startsWith("/api/")) {
    event.respondWith(navigationFallback(request));
    return;
  }

  if (sameOrigin && !url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
`;

  writeFileSync(join(outDir, "sw.js"), source, "utf8");
}

if (!existsSync(outDir)) {
  throw new Error(`Missing static export at ${outDir}`);
}

for (const asset of ["manifest.webmanifest", "offline.html", "apple-touch-icon.png"]) {
  const source = join(publicDir, asset);
  if (existsSync(source)) {
    copyFileSync(source, join(outDir, asset));
  }
}

const screenshotsDir = join(publicDir, "screenshots");
mkdirSync(join(outDir, "screenshots"), { recursive: true });
for (const file of ["desktop-wide.png", "mobile-home.png"]) {
  const source = join(screenshotsDir, file);
  if (existsSync(source)) {
    copyFileSync(source, join(outDir, "screenshots", file));
  }
}

writeServiceWorker(buildPrecacheManifest());

writeFileSync(
  join(outDir, "pwa-ready.txt"),
  "ok\n",
  "utf8",
);
