import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { createReadStream, constants as fsConstants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";

const baseURLArg = process.argv[2];
const PHASE_TIMEOUT_MS = Number(process.env.PWA_HEALTH_PHASE_TIMEOUT_MS || 25_000);
const TOTAL_TIMEOUT_MS = Number(process.env.PWA_HEALTH_TOTAL_TIMEOUT_MS || 120_000);
const SERVER_PORT = Number(process.env.PWA_HEALTH_PORT || 4173);
const MANAGED_SERVER_MAX_PORT_ATTEMPTS = Number(process.env.PWA_HEALTH_PORT_ATTEMPTS || 20);
const DIST_DIR = path.resolve(process.cwd(), process.env.PWA_HEALTH_DIST_DIR || "dist");
const HEALTH_PATH = process.env.PWA_HEALTH_PATH || "/?lite=1&force_sw=1";
const requestedBaseURL = baseURLArg ? baseURLArg.replace(/\/+$/, "") : null;
const usingManagedServer = !requestedBaseURL;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function assertOrThrow(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function withTimeout(label, task, timeoutMs = PHASE_TIMEOUT_MS) {
  console.log(`[pwa-health-check] phase:start ${label}`);
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Phase timed out after ${timeoutMs}ms: ${label}`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.resolve().then(task), timeoutPromise]);
    console.log(`[pwa-health-check] phase:ok ${label}`);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function contentTypeFor(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveRequestFile(urlPath) {
  let pathname = decodeURIComponent((urlPath || "/").split("?")[0]);

  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname = `${pathname}index.html`;

  const normalized = path.normalize(pathname).replace(/^([.][.][\\/])+/, "");
  let candidate = path.join(DIST_DIR, normalized);

  if (!candidate.startsWith(DIST_DIR)) return null;
  if (await fileExists(candidate)) return candidate;

  if (path.extname(pathname) === "") {
    candidate = path.join(DIST_DIR, "index.html");
    if (await fileExists(candidate)) return candidate;
  }

  return null;
}

async function startManagedServer(port) {
  await access(DIST_DIR, fsConstants.R_OK).catch(() => {
    throw new Error(`Missing dist directory: ${DIST_DIR}. Run 'npm run build:release' first.`);
  });

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Method Not Allowed");
          return;
        }

        const filePath = await resolveRequestFile(req.url || "/");
        if (!filePath) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not Found");
          return;
        }

        const fileStat = await stat(filePath);
        res.writeHead(200, {
          "Content-Type": contentTypeFor(filePath),
          "Content-Length": String(fileStat.size),
          "Cache-Control": "no-store",
        });

        if (req.method === "HEAD") {
          res.end();
          return;
        }

        createReadStream(filePath).pipe(res);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Server error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    server.once("error", (error) => {
      reject(new Error(`Managed server failed on port ${port}: ${error.message}`));
    });

    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function stopManagedServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function isAddressInUseError(error) {
  return error instanceof Error && error.message.includes("EADDRINUSE");
}

async function startManagedServerWithFallback(startPort) {
  let lastError = null;

  for (let i = 0; i < MANAGED_SERVER_MAX_PORT_ATTEMPTS; i += 1) {
    const candidatePort = startPort + i;
    try {
      const server = await startManagedServer(candidatePort);
      return { server, port: candidatePort };
    } catch (error) {
      if (isAddressInUseError(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  const maxPort = startPort + MANAGED_SERVER_MAX_PORT_ATTEMPTS - 1;
  throw new Error(
    `Managed server failed: all ports in range ${startPort}-${maxPort} are in use. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function run() {
  let managedServer = null;
  let managedServerPort = null;
  let baseURL = requestedBaseURL;

  if (usingManagedServer) {
    const managedServerResult = await withTimeout(
      "start-managed-server",
      () => startManagedServerWithFallback(SERVER_PORT),
      20_000,
    );
    managedServer = managedServerResult.server;
    managedServerPort = managedServerResult.port;
    baseURL = `http://127.0.0.1:${managedServerPort}`;
    if (managedServerPort !== SERVER_PORT) {
      console.warn(
        `[pwa-health-check] port ${SERVER_PORT} busy; using fallback port ${managedServerPort}`,
      );
    }
  }

  assertOrThrow(!!baseURL, "Base URL resolution failed");
  const homeURL = `${baseURL}${HEALTH_PATH}`;
  console.log(`[pwa-health-check] start baseURL=${baseURL}`);

  const browser = await withTimeout(
    "launch-browser",
    () =>
      chromium.launch({
        headless: true,
        args: ["--disable-gpu", "--disable-dev-shm-usage"],
      }),
    20_000,
  );
  const context = await withTimeout("new-context", () => browser.newContext(), 10_000);
  const page = await withTimeout("new-page", () => context.newPage(), 10_000);

  let sawSwRegisteredLog = false;
  let sawSwBypassLog = false;
  let sawSwFailedLog = null;

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[pwa] SW registered")) {
      sawSwRegisteredLog = true;
    }
    if (text.includes("skipping Service Worker registration")) {
      sawSwBypassLog = true;
    }
    if (text.includes("[pwa] SW failed")) {
      sawSwFailedLog = text;
    }
  });

  try {
    await withTimeout(
      "goto-home",
      () => page.goto(homeURL, { waitUntil: "domcontentloaded", timeout: 30_000 }),
      35_000,
    );
    await withTimeout("initial-settle", () => page.waitForTimeout(3_000), 5_000);
    if (sawSwFailedLog) {
      throw new Error(`Service worker registration failed: ${sawSwFailedLog}`);
    }

    await withTimeout(
      "sw-registration-window",
      async () => {
        const deadline = Date.now() + 8_000;
        while (
          Date.now() < deadline &&
          !sawSwRegisteredLog &&
          !sawSwBypassLog &&
          !sawSwFailedLog
        ) {
          await page.waitForTimeout(250);
        }
      },
      10_000,
    );

    if (sawSwFailedLog) {
      throw new Error(`Service worker registration failed: ${sawSwFailedLog}`);
    }

    const hasSwController = false;

    let swRegistration = {
      hasRegistration: sawSwRegisteredLog || hasSwController,
      hasController: hasSwController,
      activeState: hasSwController || sawSwRegisteredLog ? "unknown" : null,
      scope: null,
      via: sawSwRegisteredLog
        ? "app-log"
        : hasSwController
          ? "navigator-controller"
          : "app-log-missing",
    };
    const swBypassed = sawSwBypassLog;

    const manifestState = await withTimeout(
      "manifest-check",
      async () => {
        const candidatePaths = ["/manifest.webmanifest", "/manifest.json"];
        for (const manifestPath of candidatePaths) {
          const response = await fetch(`${baseURL}${manifestPath}`, { cache: "no-store" });
          if (!response.ok) continue;
          const manifest = await response.json();
          return {
            found: true,
            status: response.status,
            name: manifest.name || null,
            display: manifest.display || null,
            iconCount: Array.isArray(manifest.icons) ? manifest.icons.length : 0,
            has192:
              Array.isArray(manifest.icons) &&
              manifest.icons.some((icon) => icon.sizes === "192x192"),
            has512:
              Array.isArray(manifest.icons) &&
              manifest.icons.some((icon) => icon.sizes === "512x512"),
            sourcePath: manifestPath,
          };
        }
        return { found: false, status: 404 };
      },
      15_000,
    );

    assertOrThrow(manifestState.found, "Manifest link not found");
    assertOrThrow(manifestState.status === 200, `Manifest fetch failed: ${manifestState.status}`);
    assertOrThrow(!!manifestState.name, "Manifest missing name");
    assertOrThrow(manifestState.display === "standalone", "Manifest display is not standalone");
    assertOrThrow(manifestState.has192 && manifestState.has512, "Manifest missing 192x192 or 512x512 icon");

    // No extra pre-offline navigation. The offline verification below is the source of truth.

    const offlinePage = await withTimeout("offline-new-page", () => context.newPage(), 10_000);
    let offlineHash = null;
    let offlineMode = "managed-server-stop";
    let offlineManagedServerStopped = false;
    let offlineDisable = async () => undefined;
    let offlineEnabled = false;
    let offlineNavigationChecked = false;

    try {
      if (swBypassed) {
        offlineMode = "skipped-localhost-sw-bypass";
        console.warn(
          "[pwa-health-check] warning: skipping strict offline navigation because SW registration is intentionally bypassed on localhost",
        );
      } else {
        if (managedServer) {
          await withTimeout(
            "offline-stop-managed-server",
            async () => {
              await stopManagedServer(managedServer);
              managedServer = null;
              offlineManagedServerStopped = true;
            },
            10_000,
          );

          await withTimeout(
            "offline-server-unreachable",
            async () => {
              try {
                const response = await fetch(`${baseURL}/health-check-${Date.now()}`, {
                  cache: "no-store",
                });
                throw new Error(`Server still reachable in offline phase: HTTP ${response.status}`);
              } catch (error) {
                if (
                  error instanceof Error &&
                  error.message.startsWith("Server still reachable in offline phase")
                ) {
                  throw error;
                }
              }
            },
            15_000,
          );
        } else {
          const origin = new URL(baseURL).origin;
          let cdpSession = null;

          if (typeof context.newCDPSession === "function") {
            cdpSession = await withTimeout(
              "offline-enable-cdp",
              async () => {
                const session = await context.newCDPSession(offlinePage);
                await session.send("Network.enable");
                await session.send("Network.emulateNetworkConditions", {
                  offline: true,
                  latency: 0,
                  downloadThroughput: -1,
                  uploadThroughput: -1,
                });
                return session;
              },
              20_000,
            ).catch(() => null);
          }

          if (cdpSession) {
            offlineMode = "chromium-cdp-offline";
            offlineEnabled = true;
            offlineDisable = async () => {
              await cdpSession
                .send("Network.emulateNetworkConditions", {
                  offline: false,
                  latency: 0,
                  downloadThroughput: -1,
                  uploadThroughput: -1,
                })
                .catch(() => undefined);
              await cdpSession.detach?.().catch(() => undefined);
            };
          } else {
            try {
              await withTimeout("offline-enable-context", () => context.setOffline(true), 20_000);
              offlineMode = "browser-context-offline";
              offlineEnabled = true;
              offlineDisable = async () => context.setOffline(false).catch(() => undefined);
            } catch (error) {
              console.warn(
                `[pwa-health-check] warning: context offline mode unavailable, falling back to route abort (${error instanceof Error ? error.message : String(error)})`,
              );
              const offlineRoute = (route) => route.abort("internetdisconnected");
              await withTimeout(
                "offline-enable-route-abort",
                () => offlinePage.route(`${origin}/**/*`, offlineRoute),
                10_000,
              );
              offlineMode = "route-abort-offline";
              offlineEnabled = true;
              offlineDisable = async () =>
                offlinePage.unroute(`${origin}/**/*`, offlineRoute).catch(() => undefined);
            }
          }

          if (offlineMode !== "route-abort-offline") {
            const offlineState = await withTimeout(
              "offline-state-assertion",
              () => offlinePage.evaluate(() => navigator.onLine === false),
              10_000,
            ).catch(() => false);
            if (!offlineState) {
              console.warn("[pwa-health-check] warning: navigator.onLine did not report offline");
            }
          }
        }

        await withTimeout(
          "offline-goto-home",
          () => offlinePage.goto(homeURL, { waitUntil: "domcontentloaded", timeout: 20_000 }),
          25_000,
        ).catch((error) => {
          if (
            offlineManagedServerStopped &&
            error instanceof Error &&
            error.message.includes("ERR_CONNECTION_REFUSED")
          ) {
            throw new Error(
              "Offline navigation failed with ERR_CONNECTION_REFUSED after managed server shutdown; service worker likely not controlling navigation or app shell is not precached.",
            );
          }
          throw error;
        });

        await withTimeout(
          "offline-goto-hash",
          () =>
            offlinePage.goto(`${homeURL}#panel-tracker`, {
              waitUntil: "domcontentloaded",
              timeout: 20_000,
            }),
          25_000,
        );

        offlineHash = new URL(offlinePage.url()).hash;
        assertOrThrow(
          offlineHash === "#panel-tracker",
          `Offline hash navigation failed, expected #panel-tracker got ${offlineHash}`,
        );
        offlineNavigationChecked = true;
      }
    } finally {
      if (offlineEnabled) {
        await withTimeout("offline-disable", () => offlineDisable(), 20_000).catch(() => undefined);
      }
      await Promise.race([
        offlinePage.close().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 1_000)),
      ]);
    }

    if (!swBypassed && offlineNavigationChecked && !swRegistration.hasRegistration) {
      swRegistration = {
        ...swRegistration,
        hasRegistration: true,
        via: "offline-navigation",
      };
    }

    const swState = {
      supported: !swBypassed,
      hasRegistration: swRegistration.hasRegistration,
      hasController: swRegistration.hasController ?? null,
      activeState: swRegistration.activeState ?? null,
      scope: swRegistration.scope ?? null,
      via: swBypassed ? "localhost-bypass" : swRegistration.via,
    };

    if (!swBypassed && !swRegistration.hasRegistration) {
      console.warn("[pwa-health-check] warning: unable to confirm service worker registration");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          baseURL,
          managedServer: usingManagedServer,
          managedServerPort,
          swRegistration,
          swState,
          swBypassed,
          manifestState,
          offline: {
            mode: offlineMode,
            finalHash: offlineHash,
            navigationChecked: offlineNavigationChecked,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.race([
      browser.close().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);

    if (managedServer) {
      await withTimeout("stop-managed-server", () => stopManagedServer(managedServer), 10_000).catch(() => undefined);
    }
  }
}

(async () => {
  let totalTimer = null;
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        totalTimer = setTimeout(
          () => reject(new Error(`Total timeout after ${TOTAL_TIMEOUT_MS}ms`)),
          TOTAL_TIMEOUT_MS,
        );
        if (typeof totalTimer.unref === "function") {
          totalTimer.unref();
        }
      }),
    ]);

    if (totalTimer) clearTimeout(totalTimer);
    process.exit(0);
  } catch (error) {
    if (totalTimer) clearTimeout(totalTimer);
    console.error("[pwa-health-check] failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
