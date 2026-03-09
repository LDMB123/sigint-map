import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchDashboardShell } from "@/lib/api";

describe("api helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes the dashboard shell payload so lazy sections stay unloaded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: { dispensaries: [] },
        history: [],
        jobs: [],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDashboardShell();

    expect(payload.history).toBeUndefined();
    expect(payload.jobs).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/dashboard?history_limit=0&job_limit=0"),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });
});
