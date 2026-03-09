"use client";

import type { DashboardPayload, OfflineSnapshot, PendingViewOp, SavedView } from "@/lib/types";

type DbModule = typeof import("dexie");
type TrackerDb = import("dexie").Dexie & {
  dashboardSnapshots: {
    put: (value: OfflineSnapshot) => Promise<string>;
    get: (id: string) => Promise<OfflineSnapshot | undefined>;
  };
  savedViews: {
    put: (value: SavedView) => Promise<string>;
    delete: (id: string) => Promise<void>;
    orderBy: (index: string) => { reverse: () => { toArray: () => Promise<SavedView[]> } };
  };
  pendingViewOps: {
    put: (value: PendingViewOp) => Promise<string>;
  };
  installPrefs: {
    put: (value: { key: string; value: string }) => Promise<string>;
    get: (id: string) => Promise<{ key: string; value: string } | undefined>;
  };
};

let dbPromise: Promise<TrackerDb | null> | null = null;

async function getDb(): Promise<TrackerDb | null> {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = import("dexie").then((mod: DbModule) => {
      class TrackerDatabase extends mod.default {
        dashboardSnapshots!: TrackerDb["dashboardSnapshots"];
        savedViews!: TrackerDb["savedViews"];
        pendingViewOps!: TrackerDb["pendingViewOps"];
        installPrefs!: TrackerDb["installPrefs"];

        constructor() {
          super("gdl-flower-tracker-pwa");
          this.version(1).stores({
            dashboardSnapshots: "id, capturedAt",
            savedViews: "id, updatedAt, name",
            pendingViewOps: "id, kind, createdAt",
            installPrefs: "key",
          });
        }
      }

      return new TrackerDatabase() as TrackerDb;
    });
  }
  return dbPromise;
}

export async function saveSnapshot(payload: DashboardPayload) {
  const db = await getDb();
  if (!db) return;
  await db.dashboardSnapshots.put({
    id: "latest",
    payload,
    capturedAt: new Date().toISOString(),
  });
}

export async function getLatestSnapshot() {
  const db = await getDb();
  if (!db) return null;
  return (await db.dashboardSnapshots.get("latest")) ?? null;
}

export async function setInstallPref(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.installPrefs.put({ key, value });
}

export async function getInstallPref(key: string) {
  const db = await getDb();
  if (!db) return null;
  return (await db.installPrefs.get(key))?.value ?? null;
}

export async function listSavedViews() {
  const db = await getDb();
  if (!db) return [];
  return db.savedViews.orderBy("updatedAt").reverse().toArray();
}

export async function upsertSavedView(view: SavedView) {
  const db = await getDb();
  if (!db) return;
  await db.savedViews.put(view);
  await db.pendingViewOps.put({
    id: `save:${view.id}:${view.updatedAt}`,
    kind: "save",
    savedViewId: view.id,
    createdAt: view.updatedAt,
  });
}

export async function deleteSavedView(id: string) {
  const db = await getDb();
  if (!db) return;
  const createdAt = new Date().toISOString();
  await db.savedViews.delete(id);
  await db.pendingViewOps.put({
    id: `delete:${id}:${createdAt}`,
    kind: "delete",
    savedViewId: id,
    createdAt,
  });
}
