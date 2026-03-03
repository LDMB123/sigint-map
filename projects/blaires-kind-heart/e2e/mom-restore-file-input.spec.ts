import { expect, test } from "@playwright/test";
import { openMomDashboard, waitForAppReady } from "./helpers";

test.use({ video: "off" });

test.describe("mom dashboard persistence", () => {
  test.setTimeout(120_000);

  test("persists saved note and weekly goal values", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");

    await openMomDashboard(page);

    const note = `mom-note-${Date.now()}`;
    await page.locator("[data-mom-note]").fill(note);

    const actsToggle = page.locator("[data-goal-toggle=\"acts\"]");
    await actsToggle.click();
    await expect(actsToggle).toHaveClass(/--on/);

    const actsValue = page.locator("[data-slider-value=\"acts\"]");
    const baseline = Number.parseInt((await actsValue.textContent()) ?? "10", 10);
    await page.locator("[data-slider-plus=\"acts\"]").click();
    await expect(actsValue).toHaveText(String(Math.min(30, baseline + 1)));

    await page.locator("[data-mom-save]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);

    await openMomDashboard(page);

    await expect(page.locator("[data-mom-note]")).toHaveValue(note);
    await expect(page.locator("[data-goal-toggle=\"acts\"]")).toHaveClass(/--on/);
    await expect(page.locator("[data-slider-value=\"acts\"]")).toHaveText(
      String(Math.min(30, baseline + 1)),
    );

    await page.locator("[data-mom-close]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);
  });
});
