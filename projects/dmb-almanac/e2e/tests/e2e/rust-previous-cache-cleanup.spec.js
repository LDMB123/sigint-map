import { test, expect } from "@playwright/test";
import { ensureSwDetailsOpen, gotoHydrated, skipUnlessRust } from "./_rust_test_utils.js";

test.describe("Rust previous cache cleanup", () => {
  skipUnlessRust(test, "Rust E2E disabled (set RUST_E2E=1)");

  test("removes old CacheStorage entries without deleting Rust caches", async ({
    page,
  }) => {
    await gotoHydrated(page, "/");

    // Create old caches after the app is loaded so the test is deterministic.
    await page.evaluate(async () => {
      const old1 = await caches.open("dmb-shell-old-test");
      await old1.put("/old-shell.txt", new Response("old shell"));

      const old2 = await caches.open("dmb-api-old-test");
      await old2.put(
        "/old-api.json",
        new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        }),
      );

      const keep = await caches.open("dmb-almanac-rs-keep-test");
      await keep.put("/keep.txt", new Response("keep"));
    });

    await ensureSwDetailsOpen(page);
    await page.getByRole("button", { name: "Cleanup old caches" }).click();

    // Wait for the UI to acknowledge completion.
    await expect(page.getByText(/Old caches:/)).toBeVisible();

    const keys = await page.evaluate(async () => {
      const keys = await caches.keys();
      return keys.sort();
    });

    expect(keys).not.toContain("dmb-shell-old-test");
    expect(keys).not.toContain("dmb-api-old-test");
    expect(keys).toContain("dmb-almanac-rs-keep-test");
  });
});
