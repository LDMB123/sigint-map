import { expect, test } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

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
});
