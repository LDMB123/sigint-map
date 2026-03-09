import {
  DASHBOARD_HISTORY_LIMIT,
  DASHBOARD_JOB_LIMIT,
  DASHBOARD_SHELL_PATH,
  REQUEST_TIMEOUT_MS,
} from "@/lib/dashboard";
import type { DashboardPayload, HistoryRecord, JobRun } from "@/lib/types";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE || "";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(typeof payload === "string" ? payload : payload?.detail || `${response.status} ${response.statusText}`);
    }
    return payload as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchDashboardShell() {
  const payload = await fetchJson<DashboardPayload>(DASHBOARD_SHELL_PATH);
  return {
    ...payload,
    history: undefined,
    jobs: undefined,
  } satisfies DashboardPayload;
}

export function fetchPriceHistory(limit = DASHBOARD_HISTORY_LIMIT) {
  return fetchJson<HistoryRecord[]>(`/api/price-history?limit=${limit}`);
}

export function fetchJobs(limit = DASHBOARD_JOB_LIMIT) {
  return fetchJson<{ jobs: JobRun[] }>(`/api/jobs?limit=${limit}`);
}

export function postRefresh() {
  return fetchJson<Record<string, unknown>>("/api/refresh", { method: "POST" });
}

export function postSync() {
  return fetchJson<Record<string, unknown>>("/api/sync", { method: "POST" });
}

export function postScrape() {
  return fetchJson<Record<string, unknown>>("/api/scrape", { method: "POST" });
}
