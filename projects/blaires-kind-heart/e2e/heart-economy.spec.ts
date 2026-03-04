/**
 * TG-1–5: Heart economy E2E tests
 *
 * Covers: heart increment, accumulation, display, streak element, and quest heart award.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  applyFlowE2ESetup,
  clickFirstMatchingSelector,
  clickWhenSelectorAppears,
  dismissOnboardingIfPresent,
  readHearts,
} from "./helpers";

applyFlowE2ESetup(test);

async function clickAction(page: Page, action = "hug"): Promise<boolean> {
  return Promise.race([
    page.evaluate((act) => {
      const btn = document.querySelector(`[data-action="${act}"]`);
      if (!btn) return false;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return true;
    }, action),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 6_000);
    }),
  ]);
}

test.describe("heart economy", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  // TG-1
  test("TG-1: hearts increase after logging a kind act", async ({ page }) => {
    await page.goto("/?e2e=1&flows=1&demo=1&panel=panel-tracker#panel-tracker", {
      waitUntil: "domcontentloaded",
    });
    await dismissOnboardingIfPresent(page);

    await expect
      .poll(
        () => page.evaluate(() => document.querySelectorAll('[data-action="hug"]').length),
        { timeout: 45_000 }
      )
      .toBeGreaterThan(0);

    const before = await readHearts(page);
    const clicked = await clickAction(page, "hug");
    expect(clicked).toBe(true);

    await expect.poll(() => readHearts(page), { timeout: 30_000 }).toBeGreaterThan(before);
  });

  // TG-2
  test("TG-2: multiple kind acts accumulate hearts monotonically", async ({ page }) => {
    await page.goto("/?e2e=1&flows=1&demo=1&panel=panel-tracker#panel-tracker", {
      waitUntil: "domcontentloaded",
    });
    await dismissOnboardingIfPresent(page);

    await expect
      .poll(
        () => page.evaluate(() => document.querySelectorAll("[data-action]").length),
        { timeout: 45_000 }
      )
      .toBeGreaterThan(0);

    let prev = await readHearts(page);
    for (let i = 0; i < 3; i += 1) {
      const ok = await clickAction(page, "hug");
      expect(ok).toBe(true);
      // Each click should push hearts higher than the last reading.
      await expect.poll(() => readHearts(page), { timeout: 20_000 }).toBeGreaterThan(prev);
      prev = await readHearts(page);
    }
  });

  // TG-3
  test("TG-3: heart count element is visible and shows a non-negative integer", async ({
    page,
  }) => {
    await page.goto("/?e2e=1&demo=1&panel=panel-tracker#panel-tracker", {
      waitUntil: "domcontentloaded",
    });
    await dismissOnboardingIfPresent(page);

    const heartCountEl = page.locator("[data-tracker-hearts-count]");
    await expect(heartCountEl).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(
        async () => {
          const text = ((await heartCountEl.textContent()) ?? "").trim();
          const n = Number.parseInt(text, 10);
          return Number.isFinite(n) && n >= 0;
        },
        { timeout: 20_000 }
      )
      .toBe(true);
  });

  // TG-4
  test("TG-4: streak element is present in the tracker panel", async ({ page }) => {
    await page.goto("/?e2e=1&demo=1&panel=panel-tracker#panel-tracker", {
      waitUntil: "domcontentloaded",
    });
    await dismissOnboardingIfPresent(page);

    // [data-streak] is rendered by streaks.rs and updated by ui.rs.
    await expect
      .poll(
        () => page.evaluate(() => document.querySelector("[data-streak]") !== null),
        { timeout: 30_000 }
      )
      .toBe(true);
  });

  // TG-5
  test("TG-5: quest completion awards at least one heart", async ({ page }) => {
    await page.goto("/?e2e=1&flows=1&panel=panel-quests#panel-quests", {
      waitUntil: "domcontentloaded",
    });
    await dismissOnboardingIfPresent(page);

    await expect
      .poll(
        () => page.evaluate(() => document.querySelectorAll("[data-quest-idx]").length),
        { timeout: 30_000 }
      )
      .toBeGreaterThan(0);

    // Click a quest to open the completion prompt.
    const triggered = await clickFirstMatchingSelector(page, "[data-quest-idx]");
    expect(triggered).toBe(true);

    // Confirm the quest completion.
    const confirmed = await clickWhenSelectorAppears(page, ".quest-confirm-prompt button");
    expect(confirmed).toBe(true);

    // After completion, hearts should be > 0 (quest awards hearts).
    await expect.poll(() => readHearts(page), { timeout: 30_000 }).toBeGreaterThan(0);
  });
});
