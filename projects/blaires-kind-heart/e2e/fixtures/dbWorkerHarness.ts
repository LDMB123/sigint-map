import type { Page } from "@playwright/test";

type WorkerParam = string | number | boolean | null;

export type DbWorkerRequest = {
  type: string;
  sql?: string;
  params?: WorkerParam[];
  statements?: [string, WorkerParam[]][];
  snapshot_json?: string;
  [key: string]: unknown;
};

export type DbWorkerResponse<T = unknown> = {
  type: string;
  message?: string;
  data?: T;
  request_id?: number;
  [key: string]: unknown;
};

type InstallOptions = {
  workerUrl?: string;
  startRequestId?: number;
};

type RequestOptions = {
  timeoutMs?: number;
};

const HARNESS_KEY = "__bkhE2EDbWorkerHarness";

export async function installDbWorkerHarness(
  page: Page,
  { workerUrl = "/db-worker.js", startRequestId = 1 }: InstallOptions = {},
): Promise<void> {
  await page.evaluate(
    ({ key, url, requestId }) => {
      const win = window as Record<string, any>;
      const existing = win[key];
      if (existing?.worker) {
        try {
          existing.worker.terminate();
        } catch {
          // Ignore stale worker cleanup failures.
        }
      }
      win[key] = {
        worker: new Worker(url, { type: "module" }),
        requestId,
      };
    },
    { key: HARNESS_KEY, url: workerUrl, requestId: startRequestId },
  );
}

export async function terminateDbWorkerHarness(page: Page): Promise<void> {
  await page
    .evaluate((key) => {
      const win = window as Record<string, any>;
      const harness = win[key];
      if (harness?.worker) {
        try {
          harness.worker.terminate();
        } catch {
          // Ignore worker termination errors during test cleanup.
        }
      }
      delete win[key];
    }, HARNESS_KEY)
    .catch(() => {
      // Ignore navigation/context teardown race conditions.
    });
}

export async function dbWorkerRequest<T = unknown>(
  page: Page,
  requestPayload: DbWorkerRequest,
  { timeoutMs = 20_000 }: RequestOptions = {},
): Promise<DbWorkerResponse<T>> {
  return page.evaluate(
    ({ key, request, timeout }) => {
      const win = window as Record<string, any>;
      const harness = win[key];
      if (!harness?.worker) {
        throw new Error("DB worker harness is not installed");
      }

      const worker: Worker = harness.worker;
      const currentId = Number.isFinite(harness.requestId) ? harness.requestId++ : 1;

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          clearTimeout(timer);
        };

        const onMessage = (event: MessageEvent) => {
          const payload = (event.data || {}) as Record<string, unknown>;
          if (payload.request_id !== currentId) {
            return;
          }
          cleanup();
          resolve(payload);
        };

        const onError = (event: ErrorEvent) => {
          cleanup();
          reject(new Error(event.message || "Worker error"));
        };

        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Timed out waiting for db worker response ${currentId}`));
        }, timeout);

        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
        worker.postMessage({
          request,
          request_id: currentId,
        });
      });
    },
    { key: HARNESS_KEY, request: requestPayload, timeout: timeoutMs },
  ) as Promise<DbWorkerResponse<T>>;
}

export async function dbWorkerInit(page: Page): Promise<DbWorkerResponse> {
  return dbWorkerRequest(page, { type: "Init" });
}

export async function dbWorkerExec(
  page: Page,
  sql: string,
  params: WorkerParam[] = [],
): Promise<void> {
  const response = await dbWorkerRequest(page, { type: "Exec", sql, params });
  if (response.type !== "Ok") {
    throw new Error(`Expected Ok response for "${sql}" but got ${String(response.type)}`);
  }
}

export async function dbWorkerQueryRows(
  page: Page,
  sql: string,
  params: WorkerParam[] = [],
): Promise<Array<Record<string, unknown>>> {
  const response = await dbWorkerRequest<Array<Record<string, unknown>>>(page, {
    type: "Query",
    sql,
    params,
  });
  if (response.type !== "Rows") {
    throw new Error(`Expected Rows response for "${sql}" but got ${String(response.type)}`);
  }
  return Array.isArray(response.data) ? response.data : [];
}
