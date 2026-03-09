"use client";

import { lazy, Suspense } from "react";

import { computeRecentMoves, formatDateTime, formatMoneyPlain, formatRelativeTime, formatShortDate, getFilteredHistoryRecords, pluralize } from "@/lib/dashboard";
import type { DashboardPayload, FilterState } from "@/lib/types";
import { EmptyState, SectionHeading } from "@/components/ui";

const InsightsTrendChart = lazy(() =>
  import("@/components/insights-trend-chart").then((module) => ({ default: module.InsightsTrendChart })),
);

function InsightsTrendChartFallback() {
  return <div className="chart-wrap tall analytics-placeholder" data-testid="insights-chart-fallback" />;
}

export function InsightsPanel({
  payload,
  state,
  historyLoading,
  jobsLoading,
}: {
  payload: DashboardPayload | undefined;
  state: FilterState;
  historyLoading: boolean;
  jobsLoading: boolean;
}) {
  const historyRecords = getFilteredHistoryRecords(payload, state);
  const recentMoves = computeRecentMoves(historyRecords).slice(0, 8);

  return (
    <section id="panel-insights" className="tab-panel" role="tabpanel" aria-labelledby="tab-insights">
      <div className="insights-grid">
        <article className="card insights-chart">
          <SectionHeading title="Trendline" subtitle="History stays scoped to the active history filters and degrades cleanly when sparse." />
          {historyLoading ? (
            <InsightsTrendChartFallback />
          ) : historyRecords.length ? (
            <Suspense fallback={<InsightsTrendChartFallback />}>
              <InsightsTrendChart historyType={state.historyType} records={historyRecords} />
            </Suspense>
          ) : (
            <EmptyState title="No history yet" message="No history for the current slice yet." />
          )}
        </article>

        <article className="card">
          <SectionHeading title="Recent Moves" subtitle="Problem-first price changes, ordered by the largest visible shift." />
          <div className="activity-list">
            {recentMoves.length ? (
              recentMoves.map((move) => (
                <div key={[move.dispensary, move.strain, move.size, move.recordedAt].join("|")} className="activity-item">
                  <div>
                    <div className="activity-title">
                      {move.strain} · {move.size}
                    </div>
                    <div className="activity-meta">
                      {move.dispensary} · {formatDateTime(move.recordedAt)}
                    </div>
                  </div>
                  <div className={`delta-pill ${move.delta > 0 ? "delta-pill--up" : "delta-pill--down"}`}>
                    {move.delta > 0 ? "+" : ""}
                    {formatMoneyPlain(move.delta)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No moves" message="No visible price changes to show." />
            )}
          </div>
        </article>

        <article className="card">
          <SectionHeading title="Tracker Ops Digest" subtitle="Operational health is visible here without crowding the shopper flow." />
          <div className="activity-list">
            <div className="activity-item">
              <div>
                <div className="activity-title">Last dashboard update</div>
                <div className="activity-meta">
                  {payload?.status?.lastActivity ? formatRelativeTime(payload.status.lastActivity) : "No successful run recorded"}
                </div>
              </div>
            </div>
            <div className="activity-item">
              <div>
                <div className="activity-title">Active jobs</div>
                <div className="activity-meta">
                  {jobsLoading ? "Loading jobs…" : pluralize(payload?.jobs?.filter((job) => job.status === "running").length || 0, "job")}
                </div>
              </div>
            </div>
            <div className="activity-item">
              <div>
                <div className="activity-title">Price coverage</div>
                <div className="activity-meta">
                  {payload?.scrapeStatus?.priceCoverage != null ? `${payload.scrapeStatus.priceCoverage}% of current records priced` : "No coverage data"}
                </div>
              </div>
            </div>
            <div className="activity-item">
              <div>
                <div className="activity-title">Most recent scrape</div>
                <div className="activity-meta">
                  {payload?.scrapeStatus?.lastScrape ? formatShortDate(payload.scrapeStatus.lastScrape) : "No scrape recorded"}
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
