"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getPriceChartRows, getTopStrains, formatPrice } from "@/lib/dashboard";
import type { VisibleModel } from "@/lib/types";
import { SectionHeading } from "@/components/ui";

function chartTooltipFormatter(value: unknown) {
  if (typeof value === "number") return formatPrice(value);
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "—");
}

export function OverviewAnalytics({ model }: { model: VisibleModel }) {
  const strains = getTopStrains(model);
  const priceChartRows = getPriceChartRows(model);

  return (
    <div className="overview-analytics" data-testid="overview-analytics-loaded">
      <article className="card analytics-card">
        <SectionHeading title="Top Strains" subtitle="Most widely visible matches across the current filtered market." />
        <div className="chart-wrap chart-wrap--compact">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={strains}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis dataKey="strain" stroke="var(--text-soft)" tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-soft)" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip formatter={chartTooltipFormatter} />
              <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                {strains.map((entry) => (
                  <Cell key={entry.strain} fill="var(--chart-accent)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card analytics-card">
        <SectionHeading title="Price Range" subtitle="Average visible pricing by store for the currently dominant size." />
        <div className="chart-wrap chart-wrap--compact">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceChartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis dataKey="dispensary" stroke="var(--text-soft)" tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-soft)" tickLine={false} axisLine={false} />
              <Tooltip formatter={chartTooltipFormatter} />
              <Area dataKey="REC" type="monotone" stroke="var(--chart-warn)" fill="var(--chart-warn-soft)" />
              <Area dataKey="MED" type="monotone" stroke="var(--chart-accent)" fill="var(--chart-accent-soft)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
