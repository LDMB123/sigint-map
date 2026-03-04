import { promises as fs } from "node:fs";
import path from "node:path";
import { devices, expect, test } from "@playwright/test";
import { dismissOnboardingIfPresent, waitForAppReady } from "./helpers";

type IpadPerformanceBudgetConfig = {
  version: number;
  device_profile: string;
  source_template: string;
  budgets: {
    boot_ms_max: number;
    panel_transition_ms_max: number;
    panel_transition_p95_ms_max: number;
    session_stability_probe_ms: number;
    runtime_error_events_max: number;
  };
  scenarios: {
    panel_open_sequence: string[];
    transition_cycles: number;
  };
};

const CONFIG_PATH = path.join(process.cwd(), "config", "ipad-performance-budget.json");
const REPORT_DIR = path.join(process.cwd(), "scripts", "reports");
const HOME_PANEL_ID = "home-scene";
// rust/navigation.rs debounces panel-open events at 300ms.
const PANEL_OPEN_DEBOUNCE_BUFFER_MS = 320;

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[idx];
}

function isoStampCompact(): string {
  return new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace("T", "-")
    .slice(0, 15);
}

async function loadBudgetConfig(): Promise<IpadPerformanceBudgetConfig> {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as IpadPerformanceBudgetConfig;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !parsed.budgets ||
    !parsed.scenarios ||
    !Array.isArray(parsed.scenarios.panel_open_sequence)
  ) {
    throw new Error("Invalid config/ipad-performance-budget.json shape");
  }
  if (parsed.scenarios.panel_open_sequence.length === 0) {
    throw new Error("panel_open_sequence must contain at least one panel");
  }
  return parsed;
}

test.use({
  ...devices["iPad Mini"],
  video: "off",
  serviceWorkers: "block",
});
test.setTimeout(180_000);

test("iPad performance budgets stay within RC3 limits", async ({ page }) => {
  const budget = await loadBudgetConfig();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto("/?e2e=1&lite=1&perf=throughput", { waitUntil: "domcontentloaded" });
  await waitForAppReady(page, "panel-tracker", 45_000);
  await dismissOnboardingIfPresent(page);
  await page.waitForTimeout(500);

  const readRuntimePerf = async () =>
    page.evaluate(() => {
      const body = document.body;
      return {
        perfMode: body.getAttribute("data-perf-mode") ?? "unknown",
        deviceProfile: body.getAttribute("data-device-profile") ?? "unknown",
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        dpr: window.devicePixelRatio,
        touchPoints: navigator.maxTouchPoints,
        userAgent: navigator.userAgent,
      };
    });

  let runtimePerf = await readRuntimePerf();
  for (let attempt = 0; attempt < 5 && runtimePerf.deviceProfile === "unknown"; attempt += 1) {
    await page.waitForTimeout(300);
    runtimePerf = await readRuntimePerf();
  }
  const rawRuntimeDeviceProfile = runtimePerf.deviceProfile;
  if (runtimePerf.deviceProfile === "unknown") {
    const matchesIpadMini6Dims = (w: number, h: number) =>
      (w === 744 && h === 1133) ||
      (w === 1133 && h === 744) ||
      (w === 768 && h === 1024) ||
      (w === 1024 && h === 768);
    const dimsMatch =
      matchesIpadMini6Dims(runtimePerf.screenWidth, runtimePerf.screenHeight) ||
      matchesIpadMini6Dims(runtimePerf.availWidth, runtimePerf.availHeight) ||
      matchesIpadMini6Dims(runtimePerf.outerWidth, runtimePerf.outerHeight);
    const dprMatch = Math.abs(runtimePerf.dpr - 2) < 0.05;
    const hasIpadUserAgent = /ipad/i.test(runtimePerf.userAgent);
    if (dimsMatch && dprMatch && (runtimePerf.touchPoints > 0 || hasIpadUserAgent)) {
      runtimePerf = {
        ...runtimePerf,
        deviceProfile: "ipad-mini-6",
      };
    }
  }
  const runtimeDeviceProfileInferred =
    rawRuntimeDeviceProfile === "unknown" && runtimePerf.deviceProfile === "ipad-mini-6";

  const bootMs = await page.evaluate(() => {
    const measured = performance.getEntriesByName("wasm-init-total");
    if (measured.length > 0) {
      const entry = measured[measured.length - 1];
      return Number(entry?.duration ?? Number.NaN);
    }
    const start = performance.getEntriesByName("wasm-init-start")[0]?.startTime;
    const end = performance.getEntriesByName("wasm-init-end")[0]?.startTime;
    if (typeof start === "number" && typeof end === "number") {
      return end - start;
    }
    return Number.NaN;
  });

  const transitionSamples: number[] = [];
  for (let cycle = 0; cycle < budget.scenarios.transition_cycles; cycle += 1) {
    for (const panelId of budget.scenarios.panel_open_sequence) {
      const openMs = await page.evaluate(async ({
        targetPanelId,
        homePanelId,
        debounceMs,
      }: {
        targetPanelId: string;
        homePanelId: string;
        debounceMs: number;
      }) => {
        const app = document.querySelector("#app");
        if (!app) {
          throw new Error("Missing #app root");
        }

        const waitFor = (predicate: () => boolean, timeoutMs: number) =>
          new Promise<number>((resolve, reject) => {
            const startedAt = performance.now();
            const tick = () => {
              if (predicate()) {
                resolve(performance.now() - startedAt);
                return;
              }
              if (performance.now() - startedAt > timeoutMs) {
                reject(new Error("timeout"));
                return;
              }
              requestAnimationFrame(tick);
            };
            tick();
          });

        const isHomeActive = () => {
          const active = app.getAttribute("data-active-panel");
          return active === homePanelId || active === "home";
        };

        if (!isHomeActive()) {
          const homeBtn = document.querySelector("[data-nav-home]") as HTMLElement | null;
          if (!homeBtn) {
            throw new Error("Missing [data-nav-home] while returning to home");
          }
          homeBtn.click();
          await waitFor(isHomeActive, 5000);
        }

        const trigger = document.querySelector(
          `[data-panel-open="${targetPanelId}"]`
        ) as HTMLElement | null;
        if (!trigger) {
          throw new Error(`Missing [data-panel-open="${targetPanelId}"]`);
        }
        trigger.click();
        const elapsedOpenMs = await waitFor(
          () => app.getAttribute("data-active-panel") === targetPanelId,
          5000
        );

        const homeBtn = document.querySelector("[data-nav-home]") as HTMLElement | null;
        if (!homeBtn) {
          throw new Error(`Missing [data-nav-home] while closing ${targetPanelId}`);
        }
        homeBtn.click();
        await waitFor(isHomeActive, 5000);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, debounceMs);
        });

        return elapsedOpenMs;
      }, {
        targetPanelId: panelId,
        homePanelId: HOME_PANEL_ID,
        debounceMs: PANEL_OPEN_DEBOUNCE_BUFFER_MS,
      });
      transitionSamples.push(openMs);
    }
  }

  const p95TransitionMs = percentile(transitionSamples, 0.95);

  const stability = await page.evaluate(
    async ({
      probeMs,
      panelSequence,
      homePanelId,
      debounceMs,
    }: {
      probeMs: number;
      panelSequence: string[];
      homePanelId: string;
      debounceMs: number;
    }) => {
      const app = document.querySelector("#app");
      if (!app) {
        throw new Error("Missing #app root");
      }

      const waitFor = (predicate: () => boolean, timeoutMs: number) =>
        new Promise<void>((resolve, reject) => {
          const startedAt = performance.now();
          const tick = () => {
            if (predicate()) {
              resolve();
              return;
            }
            if (performance.now() - startedAt > timeoutMs) {
              reject(new Error("timeout"));
              return;
            }
            requestAnimationFrame(tick);
          };
          tick();
        });

      const isHomeActive = () => {
        const active = app.getAttribute("data-active-panel");
        return active === homePanelId || active === "home";
      };

      const start = performance.now();
      let loops = 0;
      let index = 0;
      while (performance.now() - start < probeMs) {
        const panelId = panelSequence[index % panelSequence.length];
        index += 1;

        const trigger = document.querySelector(
          `[data-panel-open="${panelId}"]`
        ) as HTMLElement | null;
        if (!trigger) {
          throw new Error(`Missing [data-panel-open="${panelId}"]`);
        }
        trigger.click();
        await waitFor(() => app.getAttribute("data-active-panel") === panelId, 5000);

        const homeBtn = document.querySelector("[data-nav-home]") as HTMLElement | null;
        if (!homeBtn) {
          throw new Error("Missing [data-nav-home] during stability probe");
        }
        homeBtn.click();
        await waitFor(isHomeActive, 5000);
        loops += 1;

        await new Promise<void>((resolve) => {
          setTimeout(resolve, debounceMs);
        });
      }

      const diagnostics = (window as any).__BKH_RUNTIME_DIAGNOSTICS__;
      const scopedEvents =
        diagnostics && typeof diagnostics.events === "function"
          ? diagnostics.events("wasm-init")
          : [];
      const runtimeErrorEvents = Array.isArray(scopedEvents)
        ? scopedEvents.filter(
            (event) => event && (event.kind === "error" || event.kind === "rejection")
          ).length
        : Number.NaN;

      return {
        loops,
        runtimeErrorEvents,
        scopedEventCount: Array.isArray(scopedEvents) ? scopedEvents.length : 0,
      };
    },
    {
      probeMs: budget.budgets.session_stability_probe_ms,
      panelSequence: budget.scenarios.panel_open_sequence,
      homePanelId: HOME_PANEL_ID,
      debounceMs: PANEL_OPEN_DEBOUNCE_BUFFER_MS,
    }
  );

  const bootBudgetPass =
    Number.isFinite(bootMs) && bootMs <= budget.budgets.boot_ms_max;
  const transitionSamplePass = transitionSamples.every(
    (ms) => Number.isFinite(ms) && ms <= budget.budgets.panel_transition_ms_max
  );
  const transitionP95Pass =
    Number.isFinite(p95TransitionMs) &&
    p95TransitionMs <= budget.budgets.panel_transition_p95_ms_max;
  const stabilityPass =
    Number.isFinite(stability.runtimeErrorEvents) &&
    stability.runtimeErrorEvents <= budget.budgets.runtime_error_events_max &&
    stability.loops > 0;
  const pageErrorPass = pageErrors.length === 0;
  const perfModePass = runtimePerf.perfMode === "throughput";

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(
    REPORT_DIR,
    `ipad-performance-budget-${isoStampCompact()}.md`
  );
  const reportRel = path.relative(process.cwd(), reportPath).replaceAll("\\", "/");
  const lines = [
    "# iPad Performance Budget Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Config: \`config/ipad-performance-budget.json\``,
    `Device profile: ${budget.device_profile}`,
    `Source template: \`${budget.source_template}\``,
    "",
    "## Budget Summary",
    "",
    "| Metric | Actual | Budget | Status |",
    "|---|---|---|---|",
    `| Runtime perf mode | ${runtimePerf.perfMode} | throughput | ${perfModePass ? "PASS" : "FAIL"} |`,
    `| Runtime device profile | ${runtimePerf.deviceProfile} | ipad-mini-6 | ${runtimePerf.deviceProfile === "ipad-mini-6" ? "PASS" : "WARN"} |`,
    `| Boot time (ms) | ${bootMs.toFixed(2)} | <= ${budget.budgets.boot_ms_max} | ${bootBudgetPass ? "PASS" : "FAIL"} |`,
    `| Panel open transitions (ms, max sample) | ${Math.max(...transitionSamples).toFixed(2)} | <= ${budget.budgets.panel_transition_ms_max} | ${transitionSamplePass ? "PASS" : "FAIL"} |`,
    `| Panel open transitions (p95 ms) | ${p95TransitionMs.toFixed(2)} | <= ${budget.budgets.panel_transition_p95_ms_max} | ${transitionP95Pass ? "PASS" : "FAIL"} |`,
    `| Stability probe runtime errors/rejections | ${stability.runtimeErrorEvents} | <= ${budget.budgets.runtime_error_events_max} | ${stabilityPass ? "PASS" : "FAIL"} |`,
    `| Page-level JS errors | ${pageErrors.length} | 0 | ${pageErrorPass ? "PASS" : "FAIL"} |`,
    "",
    "## Samples",
    "",
    `- Transition samples (ms): ${transitionSamples.map((ms) => ms.toFixed(2)).join(", ")}`,
    `- Stability loops completed: ${stability.loops}`,
    `- Runtime diagnostics event count (scope=wasm-init): ${stability.scopedEventCount}`,
    `- Runtime profile sample: raw=${rawRuntimeDeviceProfile}, screen=${runtimePerf.screenWidth}x${runtimePerf.screenHeight}, avail=${runtimePerf.availWidth}x${runtimePerf.availHeight}, outer=${runtimePerf.outerWidth}x${runtimePerf.outerHeight}, dpr=${runtimePerf.dpr.toFixed(2)}, touch=${runtimePerf.touchPoints}, ua_iPad=${/ipad/i.test(runtimePerf.userAgent)}`,
    "",
    "## Notes",
    "",
    `- This is an automated iPad-profile proxy gate; physical iPad mini 6 run evidence is still required per ${budget.source_template}.`,
    "",
  ];
  if (runtimeDeviceProfileInferred) {
    lines.splice(
      lines.length - 1,
      0,
      "- Runtime device profile inferred from iPad mini dimensions because `data-device-profile` was unset at sample time."
    );
  }
  await fs.writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
  // Keep path visible in CI logs for artifact traceability.
  // eslint-disable-next-line no-console
  console.log(`[ipad-performance-budget] report: ${reportRel}`);

  expect(bootBudgetPass).toBe(true);
  expect(perfModePass).toBe(true);
  expect(transitionSamplePass).toBe(true);
  expect(transitionP95Pass).toBe(true);
  expect(stabilityPass).toBe(true);
  expect(pageErrorPass).toBe(true);
});
