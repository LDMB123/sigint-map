import { expect, type Page } from "@playwright/test";
import { dismissOnboardingIfPresent, waitForAppReady } from "../helpers";

export async function openGamesPanel(page: Page): Promise<void> {
  await page.goto("/?e2e=1&panel=panel-games#panel-games", {
    waitUntil: "domcontentloaded",
  });
  await waitForAppReady(page, "panel-games", 45_000);
  await dismissOnboardingIfPresent(page);
}

export async function launchGame(page: Page, gameId: string): Promise<void> {
  await expect
    .poll(
      () => page.evaluate((id) => document.querySelectorAll(`[data-game="${id}"]`).length, gameId),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  await page.locator(`[data-game="${gameId}"]`).first().click({ force: true });
  await expect(page.locator("#game-arena")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#game-exit-btn")).toBeVisible({ timeout: 15_000 });
}

export async function exitGameToMenu(page: Page): Promise<void> {
  await page.locator("#game-exit-btn").click({ force: true });
  await expect(page.locator("#game-arena")).toBeHidden({ timeout: 15_000 });
  await expect(page.locator("#game-exit-btn")).toBeHidden({ timeout: 15_000 });
  await expect(page.locator("#panel-games")).toBeVisible({ timeout: 15_000 });
}

async function startMemoryRound(page: Page): Promise<void> {
  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-memory-theme]").length),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  const theme = page.locator('[data-memory-theme="forest"]').first();
  if (await theme.count()) {
    await theme.click({ force: true });
  } else {
    await page.locator("[data-memory-theme]").first().click({ force: true });
  }

  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-memory-diff]").length),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  const easy = page.locator('[data-memory-diff="easy"]').first();
  if (await easy.count()) {
    await easy.click({ force: true });
  } else {
    await page.locator("[data-memory-diff]").first().click({ force: true });
  }

  await expect
    .poll(
      () => page.evaluate(() => document.querySelectorAll("[data-card-idx]").length),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
}

async function readMemoryMoves(page: Page): Promise<number> {
  return page.evaluate(() => {
    const text = (document.querySelector("[data-memory-moves]")?.textContent ?? "").trim();
    const match = text.match(/(\d+)/);
    return match ? Number.parseInt(match[1] ?? "0", 10) : 0;
  });
}

export async function assertMemoryGameLifecycle(page: Page): Promise<void> {
  await openGamesPanel(page);

  await launchGame(page, "memory");
  await startMemoryRound(page);

  const initialArenaStats = await page.evaluate(() => {
    const arena = document.querySelector("#game-arena");
    return {
      childCount: arena?.childElementCount ?? 0,
      textLength: (arena?.textContent ?? "").trim().length,
    };
  });
  expect(initialArenaStats.childCount).toBeGreaterThan(0);
  expect(initialArenaStats.textLength).toBeGreaterThan(0);

  await page.locator("[data-card-idx]").nth(0).click({ force: true });
  await page.locator("[data-card-idx]").nth(1).click({ force: true });
  await expect.poll(() => readMemoryMoves(page), { timeout: 20_000 }).toBeGreaterThan(0);

  await exitGameToMenu(page);

  const arenaAfterExit = await page.evaluate(() => {
    const arena = document.querySelector("#game-arena");
    return {
      childCount: arena?.childElementCount ?? 0,
      textLength: (arena?.textContent ?? "").trim().length,
    };
  });
  expect(arenaAfterExit.childCount).toBe(0);
  expect(arenaAfterExit.textLength).toBe(0);

  await launchGame(page, "memory");
  await startMemoryRound(page);
  await expect.poll(() => readMemoryMoves(page), { timeout: 15_000 }).toBe(0);

  await exitGameToMenu(page);
}
