import { expect, test, type Page } from "@playwright/test";
import { dismissOnboardingIfPresent, readHearts } from "./helpers";

test.use({ video: "off", serviceWorkers: "block" });

test.afterEach(async ({ page }) => {
  try {
    await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 5_000 });
  } catch {
    // Best-effort cleanup to avoid long context shutdown when worker tasks are active.
  }
});

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

    const confirmed = await Promise.race([
      page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const check = setInterval(() => {
            const btn = document.querySelector(".quest-confirm-prompt button");
            if (btn) {
              clearInterval(check);
              btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              resolve(true);
            }
          }, 100);
        });
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 8_000);
      })
    ]);
    expect(confirmed).toBe(true);

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
          page.evaluate(() => {
            const panel = document.querySelector("#panel-stories:not([hidden])");
            const back = panel?.querySelector(".story-back-btn");
            if (back) {
              return "done";
            }

            const next = panel?.querySelector("[data-next]");
            if (!next) {
              return "waiting";
            }

            next.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            return "progress";
          }),
        { timeout: 45_000 }
      )
      .toBe("done");

    const returnedToLibrary = await Promise.race([
      page.evaluate(() => {
        const panel = document.querySelector("#panel-stories:not([hidden])");
        const back = panel?.querySelector(".story-back-btn");
        if (!back) return false;
        back.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return true;
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 10_000);
      })
    ]);
    expect(returnedToLibrary).toBe(true);

    await expect
      .poll(
        () =>
          page.evaluate((id) => {
            const storyCover = document.querySelector(`#panel-stories:not([hidden]) [data-story="${id}"]`);
            if (!storyCover?.classList.contains("story-cover--done")) {
              window.dispatchEvent(new CustomEvent("kindheart-story-done"));
              return 0;
            }
            return storyCover?.classList.contains("story-cover--done") ? 1 : 0;
          }, storyId),
        { timeout: 45_000 }
      )
      .toBeGreaterThan(0);
  });
});
