import { expect, test, type Page } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

async function openMomDashboard(page: Page): Promise<void> {
  const title = page.locator(".home-title");
  await expect(title).toBeVisible();

  await title.dispatchEvent("pointerdown", {
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
  });
  await page.waitForTimeout(3200);
  await title.dispatchEvent("pointerup", {
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
  });

  const pinOverlay = page.locator("[data-mom-overlay]");
  await expect(pinOverlay).toBeVisible();
  for (const digit of ["1", "2", "3", "4"]) {
    const digitButton = pinOverlay.locator(`[data-pin-digit="${digit}"]`);
    await expect(digitButton).toBeVisible();
    await digitButton.click({ force: true });
  }

  await expect(page.locator("[data-mom-dashboard]")).toBeVisible();
}

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
