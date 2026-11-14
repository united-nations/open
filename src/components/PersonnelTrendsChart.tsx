"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { FinancialChartTooltip } from "@/components/charts/FinancialChartTooltip";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import type { PersonnelTrendsResource } from "@/hooks/usePersonnelTrends";
import { formatPeople, personnelTrendHeadcount } from "@/lib/personnel";

export function PersonnelTrendsPlot({
  trends: { data, loading, error, retry },
  scope,
  population,
}: {
  trends: PersonnelTrendsResource;
  scope: string | readonly string[];
  population: string;
}) {
  const [showStaff, setShowStaff] = useState(true);
  const rows =
    data?.years.map((row) => ({
      year: row.year,
      staff: personnelTrendHeadcount(row, scope),
    })) ?? [];
  return (
    <>
      <div
        className="mb-4 flex flex-wrap items-center gap-2"
        data-trend-legend
        aria-label="Workforce trend legend"
      >
        <LegendLabel
          label="Staff"
          color="#009edb"
          variant="pill"
          selected={showStaff}
          onToggle={() => setShowStaff((visible) => !visible)}
        />
      </div>
      {loading ? (
        <div
          role="status"
          className="flex h-72 items-center justify-center text-sm text-gray-600"
        >
          Loading personnel trends…
        </div>
      ) : error ? (
        <div role="alert" className="py-12 text-sm text-gray-600">
          Personnel trends could not be loaded.{" "}
          <button type="button" className="underline" onClick={retry}>
            Try again
          </button>
        </div>
      ) : !showStaff ? (
        <p className="flex h-72 items-center justify-center text-sm text-gray-600">
          No series selected.
        </p>
      ) : (
        <div role="img" aria-label={`Annual staff counts for ${population}`}>
          <ResponsiveContainer width="100%" height={TREND_CHART_HEIGHT}>
            <LineChart
              data={rows}
              margin={TREND_CHART_MARGIN}
              accessibilityLayer
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="year"
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(value) => formatPeople(Number(value))}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={65}
              />
              <Tooltip
                position={{ x: 0, y: 0 }}
                wrapperStyle={{ maxWidth: "100%" }}
                isAnimationActive={false}
                content={
                  <FinancialChartTooltip
                    formatValue={formatPeople}
                    unitLabel="Staff at 31 December"
                  />
                }
              />
              <Line
                type="linear"
                dataKey="staff"
                name="Staff"
                stroke="#009edb"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
