"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getHistorySeries } from "@/lib/dashboard";
import type { FilterState, HistoryRecord } from "@/lib/types";

export function InsightsTrendChart({
  historyType,
  records,
}: {
  historyType: FilterState["historyType"];
  records: HistoryRecord[];
}) {
  const historySeries = getHistorySeries(records, historyType);

  return (
    <div className="chart-wrap tall" data-testid="insights-trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historySeries}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
          <XAxis dataKey="recordedAt" stroke="var(--text-soft)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-soft)" tickLine={false} axisLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="var(--chart-accent)" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="REC" stroke="var(--chart-cool)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="MED" stroke="var(--chart-warn)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
