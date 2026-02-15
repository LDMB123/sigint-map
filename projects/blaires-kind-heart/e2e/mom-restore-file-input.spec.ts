import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { waitForAppReady } from "./helpers";

test.use({ video: "off" });

async function openMomDashboard(page: Page): Promise<void> {
  const title = page.locator(".home-title");
  await expect(title).toBeVisible();

  await title.dispatchEvent("pointerdown", {
    pointerType: "mouse",
    isPrimary: true,
    button: 0
  });
  await page.waitForTimeout(3200);
  await title.dispatchEvent("pointerup", {
    pointerType: "mouse",
    isPrimary: true,
    button: 0
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

test.describe("mom restore flow", () => {
  test.setTimeout(120_000);

  test("restores backup using real file-input selection", async ({ page }) => {
    await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page, "panel-tracker");

    await openMomDashboard(page);

    const baselineNote = `restore-baseline-${Date.now()}`;
    await page.locator("[data-mom-note]").fill(baselineNote);
    await page.locator("[data-mom-save]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);

    await openMomDashboard(page);
    await expect(page.locator("[data-mom-note]")).toHaveValue(baselineNote);

    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("[data-mom-export-json]").click()
    ]);
    const jsonPath = await jsonDownload.path();
    if (!jsonPath) {
      throw new Error("JSON export download path was not available");
    }
    const snapshotRaw = await readFile(jsonPath, "utf8");

    const mutationNote = `restore-mutation-${Date.now()}`;
    await page.locator("[data-mom-note]").fill(mutationNote);
    await page.locator("[data-mom-save]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);

    await openMomDashboard(page);
    await expect(page.locator("[data-mom-note]")).toHaveValue(mutationNote);

    const restoreInput = page.locator("[data-mom-restore-input]");
    await restoreInput.setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(snapshotRaw, "utf8")
    });

    await expect(page.locator("[data-mom-note]")).toHaveValue(baselineNote, { timeout: 15_000 });
    await expect(page.locator("[data-mom-note]")).not.toHaveValue(mutationNote);

    await page.locator("[data-mom-close]").click();
    await expect(page.locator("[data-mom-dashboard]")).toHaveCount(0);

    await openMomDashboard(page);
    await expect(page.locator("[data-mom-note]")).toHaveValue(baselineNote);
  });
});
