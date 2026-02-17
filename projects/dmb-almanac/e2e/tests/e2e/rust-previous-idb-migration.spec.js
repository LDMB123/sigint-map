import { test, expect } from "@playwright/test";
import { gotoHydrated, skipUnlessRust } from "./_rust_test_utils.js";

test.describe("Rust previous IndexedDB migration", () => {
  skipUnlessRust(test, "Rust E2E disabled (set RUST_E2E=1)");

  test("migrates prior user data store and deletes the old DB", async ({
    page,
  }) => {
    // Create a minimal old DB in the correct origin without loading the app JS first.
    await page.goto("/offline.html");
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const req = indexedDB.open("dmb-almanac", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("userFavoriteSongs")) {
            db.createObjectStore("userFavoriteSongs", {
              keyPath: "id",
              autoIncrement: true,
            });
          }
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(["userFavoriteSongs"], "readwrite");
          tx.onerror = () => reject(tx.error);
          const store = tx.objectStore("userFavoriteSongs");
          store.put({ id: 1, songId: 1, addedAt: "2026-02-06T00:00:00Z" });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });
    });

    await gotoHydrated(page, "/");

    const deadline = Date.now() + 15_000;
    let result = null;
    while (Date.now() < deadline) {
      // Poll from Node because Playwright's waitForFunction does not reliably await async predicates.
      result = await page.evaluate(async () => {
        if (typeof indexedDB.databases !== "function") return null;
        const dbs = await indexedDB.databases();
        const oldDbPresent = dbs.some((d) => d && d.name === "dmb-almanac");
        if (oldDbPresent) return null;

        return await new Promise((resolve) => {
	          // Don't pin the DB version here: the Rust app can bump schema versions over time.
	          // Opening with a lower version would raise VersionError and make this test flake/fail.
	          const req = indexedDB.open("dmb-almanac-rs");
	          req.onerror = () => resolve(null);
	          req.onsuccess = () => {
	            const db = req.result;
            const hasMeta = db.objectStoreNames.contains("syncMeta");
            const hasFavs = db.objectStoreNames.contains("userFavoriteSongs");
            if (!hasMeta || !hasFavs) {
              db.close();
              resolve(null);
              return;
            }

            const tx = db.transaction(
              ["syncMeta", "userFavoriteSongs"],
              "readonly",
            );
            tx.onerror = () => {
              db.close();
              resolve(null);
            };

            const meta = tx.objectStore("syncMeta");
            const favs = tx.objectStore("userFavoriteSongs");
            const markerReq = meta.get("previous_migration_v1");
            const countReq = favs.count();

            tx.oncomplete = () => {
              const marker = markerReq.result || null;
              const favCount =
                typeof countReq.result === "number" ? countReq.result : null;
              db.close();
              if (!marker) resolve(null);
              else resolve({ marker, favCount });
            };
          };
        });
      });

      if (result) break;
      await page.waitForTimeout(200);
    }

    expect(result).not.toBeNull();
    const { marker, favCount } = result;
    expect(marker.verified).toBe(true);
    expect(favCount).toBe(1);
  });
});
