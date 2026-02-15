import { expect, test, type Page } from "@playwright/test";

test.use({ video: "off", serviceWorkers: "block" });

test.afterEach(async ({ page }) => {
  try {
    await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 5_000 });
  } catch {
    // Best-effort cleanup to avoid long context shutdown when worker tasks are active.
  }
});

async function readHearts(page: Page): Promise<number> {
  try {
    const value = await Promise.race([
      page.evaluate(() => {
        const text = (document.querySelector("[data-tracker-hearts-count]")?.textContent ?? "").trim();
        const parsed = Number.parseInt(text, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      }),
      new Promise<number>((resolve) => {
        setTimeout(() => resolve(-1), 4_000);
      })
    ]);
    return value;
  } catch {
    return -1;
  }
}

async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  let quietCycles = 0;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const sawOnboarding = await Promise.race([
      page.evaluate(() => {
        const start = Array.from(document.querySelectorAll("button")).find((el) =>
          /let's go/i.test((el.textContent ?? "").toLowerCase())
        );
        if (!start) return false;
        (start as HTMLButtonElement).click();
        return true;
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 1_000);
      })
    ]);

    quietCycles = sawOnboarding ? 0 : quietCycles + 1;
    if (attempt >= 6 && quietCycles >= 6) {
      break;
    }
    await page.waitForTimeout(250);
  }
}

test.describe("critical user flows", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("tracker logs a kind act", async ({ page }) => {
    await page.goto("/?e2e=1&flows=1&demo=1&panel=panel-tracker#panel-tracker", { waitUntil: "domcontentloaded" });
    await dismissOnboardingIfPresent(page);
    await expect
      .poll(
        () =>
          page.evaluate(() => document.querySelectorAll('[data-action="hug"]').length),
        { timeout: 45_000 }
      )
      .toBeGreaterThan(0);
    const triggered = await Promise.race([
      page.evaluate(() => {
        const hug = document.querySelector('[data-action="hug"]');
        if (!hug) return false;
        hug.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return true;
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 8_000);
      })
    ]);
    expect(triggered).toBe(true);

    await expect.poll(() => readHearts(page), { timeout: 45_000 }).toBeGreaterThan(0);
  });

  test("quests can be completed", async ({ page }) => {
    await page.goto("/?e2e=1&flows=1&demo=1&panel=panel-quests#panel-quests", { waitUntil: "domcontentloaded" });
    await dismissOnboardingIfPresent(page);
    await expect
      .poll(() => page.evaluate(() => document.querySelectorAll("[data-quest-idx]").length), { timeout: 30_000 })
      .toBeGreaterThan(0);

    const triggered = await Promise.race([
      page.evaluate(() => {
        const quest = document.querySelector("[data-quest-idx]");
        if (!quest) return false;
        quest.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return true;
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 8_000);
      })
    ]);
    expect(triggered).toBe(true);

    await expect
      .poll(() => page.evaluate(() => document.querySelectorAll(".quest-card--done").length), { timeout: 30_000 })
      .toBeGreaterThan(0);
  });

  test("stories can be finished", async ({ page }) => {
    await page.goto("/?e2e=1&flows=1&demo=1&panel=panel-stories#panel-stories", { waitUntil: "domcontentloaded" });
    await dismissOnboardingIfPresent(page);
    const openedStories = await Promise.race([
      page.evaluate(() => {
        const openBtn = document.querySelector('[data-panel-open="panel-stories"]');
        if (!openBtn) return false;
        (openBtn as HTMLButtonElement).click();
        return true;
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 8_000);
      })
    ]);
    expect(openedStories).toBe(true);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (document.querySelector("#app")?.getAttribute("data-active-panel") === "panel-stories" ? 1 : 0)
          ),
        { timeout: 20_000 }
      )
      .toBe(1);

    await expect
      .poll(
        () => page.evaluate(() => document.querySelectorAll('#panel-stories:not([hidden]) [data-story]').length),
        { timeout: 30_000 }
      )
      .toBeGreaterThan(0);

    const storyId = await Promise.race([
      page.evaluate(() => {
        const panel = document.querySelector("#panel-stories:not([hidden])");
        const cover = panel?.querySelector("[data-story]");
        const id = cover?.getAttribute("data-story") ?? "";
        if (!id || !cover) return "";

        cover.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

        for (let i = 0; i < 12; i += 1) {
          const next = panel?.querySelector("[data-next]");
          if (!next) break;
          next.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }

        const back = panel?.querySelector(".story-back-btn");
        if (back) {
          back.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }

        return id;
      }),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(""), 10_000);
      })
    ]);

    expect(storyId).not.toBe("");
    await expect
      .poll(
        () =>
          page.evaluate((id) => {
            const storyCover = document.querySelector(`#panel-stories [data-story="${id}"]`);
            return storyCover?.classList.contains("story-cover--done") ? 1 : 0;
          }, storyId),
        { timeout: 30_000 }
      )
      .toBeGreaterThan(0);
  });
});
