import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

const GPU_STATUSES = new Set([
  "off",
  "ready",
  "fallback",
  "timeout",
  "unavailable",
  "lost",
  "recovering",
]);

test.describe("runtime diagnostics", () => {
  test("initializes diagnostics API and observer status without boot-time runtime errors", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const runtimeConsoleErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && /\[diag:wasm-init\] (error|rejection)\b/.test(text)) {
        runtimeConsoleErrors.push(text);
      }
    });

    await page.goto("/?e2e=1&lite=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");
    await page.waitForTimeout(400);

    const summary = await page.evaluate(() => {
      const api = (window as any).__BKH_RUNTIME_DIAGNOSTICS__;
      if (!api || typeof api.events !== "function") {
        return {
          hasApi: false,
          eventCount: 0,
          installEvent: null,
          inpObserverEvent: null,
          loafObserverEvent: null,
        };
      }

      const scopedEvents = api.events("wasm-init");
      const findEvent = (kind: string) => scopedEvents.find((entry) => entry.kind === kind) || null;

      return {
        hasApi: true,
        eventCount: scopedEvents.length,
        installEvent: findEvent("install"),
        inpObserverEvent: findEvent("inp-observer"),
        loafObserverEvent: findEvent("loaf-observer"),
      };
    });

    expect(summary.hasApi).toBe(true);
    expect(summary.eventCount).toBeGreaterThan(0);
    expect(summary.installEvent).not.toBeNull();
    expect(summary.inpObserverEvent).not.toBeNull();
    expect(summary.loafObserverEvent).not.toBeNull();
    expect(pageErrors).toEqual([]);
    expect(runtimeConsoleErrors).toEqual([]);
  });

  test("applies gpu=off mode and reports off status", async ({ page }) => {
    await page.goto("/?e2e=1&lite=1&gpu=off", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");

    const gpu = await page.evaluate(() => {
      const body = document.body;
      return {
        mode: body.getAttribute("data-gpu-mode"),
        status: body.getAttribute("data-gpu-status"),
      };
    });

    expect(gpu.mode).toBe("off");
    expect(gpu.status).toBe("off");
  });

  for (const mode of ["auto", "on"] as const) {
    test(`applies gpu=${mode} mode and exposes runtime gpu status`, async ({ page }) => {
      await page.goto(`/?e2e=1&lite=1&gpu=${mode}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, "panel-tracker");

      await expect
        .poll(async () => {
          return page.evaluate(() => document.body.getAttribute("data-gpu-status"));
        })
        .not.toBeNull();

      const gpu = await page.evaluate(() => {
        const body = document.body;
        return {
          mode: body.getAttribute("data-gpu-mode"),
          status: body.getAttribute("data-gpu-status"),
        };
      });

      expect(gpu.mode).toBe(mode);
      expect(gpu.status).not.toBeNull();
      expect(GPU_STATUSES.has(gpu.status as string)).toBe(true);
      expect(gpu.status).not.toBe("off");
    });
  }

  for (const mode of ["throughput", "balanced", "quality"] as const) {
    test(`applies perf=${mode} mode and exposes runtime perf mode`, async ({ page }) => {
      await page.goto(`/?e2e=1&lite=1&perf=${mode}`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page, "panel-tracker");

      const perfMode = await page.evaluate(() => document.body.getAttribute("data-perf-mode"));
      expect(perfMode).toBe(mode);
    });
  }

  test("falls back to auto perf resolution for invalid perf query values", async ({ page }) => {
    await page.goto("/?e2e=1&lite=1&perf=not-a-mode", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");

    const perfMode = await page.evaluate(() => document.body.getAttribute("data-perf-mode"));
    // Desktop Playwright profile resolves auto -> balanced.
    expect(perfMode).toBe("balanced");
  });
});
