(function attachStatusHelpers(globalScope) {
  const root = globalScope.GDLTrackerModules || (globalScope.GDLTrackerModules = {});

  function sourceKind(source) {
    const normalized = String(source || "").trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "seed" || normalized === "bootstrap") return "seed";
    if (normalized.startsWith("refresh")) return "refresh";
    if (normalized.includes("scrape")) return "scrape";
    if (normalized === "sync") return "sync";
    return "job";
  }

  function getLatestActivity(status) {
    if (!status) return null;
    return {
      recordedAt: status.lastActivity || status.lastScrape || status.lastRefresh || null,
      source: status.lastActivitySource || status.lastScrapeSource || status.lastRefreshSource || null,
      kind: status.lastActivityKind || status.lastScrapeKind || status.lastRefreshKind || null,
    };
  }

  function formatActivityCopy(status, formatRelativeTime, formatDateTime) {
    const activity = getLatestActivity(status);
    if (!activity?.recordedAt) {
      return {
        inline: "No tracker activity recorded",
        title: "No tracker activity recorded yet",
      };
    }

    const relative = formatRelativeTime(activity.recordedAt);
    const absolute = formatDateTime(activity.recordedAt);
    if (activity.kind === "seed") {
      return {
        inline: `Seeded dataset ${relative}`,
        title: `Seeded dataset loaded ${absolute}`,
      };
    }

    const labels = {
      refresh: "Listings refresh",
      scrape: "Price scrape",
      sync: "Sync job",
      job: "Tracker activity",
    };
    const label = labels[activity.kind] || "Tracker activity";
    return {
      inline: `${label} ${relative}`,
      title: `${label} ${absolute}`,
    };
  }

  function formatRefreshCopy(status, formatRelativeTime, formatDateTime) {
    if (!status?.lastRefresh) return null;
    const kind = status.lastRefreshKind || sourceKind(status.lastRefreshSource);
    const relative = formatRelativeTime(status.lastRefresh);
    const absolute = formatDateTime(status.lastRefresh);
    if (kind === "seed") {
      return {
        inline: `Seed catalog ${relative}`,
        title: `Seed catalog loaded ${absolute}`,
      };
    }
    return {
      inline: `Listings refresh ${relative}`,
      title: `Listings refresh ${absolute}`,
    };
  }

  root.status = {
    formatActivityCopy,
    formatRefreshCopy,
  };
})(window);
