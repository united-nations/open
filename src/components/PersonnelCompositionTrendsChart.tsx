"use client";
import { formatPercent } from "@un-eosg/ui/format-budget";

import { useState } from "react";
import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import type { PersonnelTrendsResource } from "@/hooks/usePersonnelTrends";
import {
  formatPeople,
  personnelCompositionTrend,
  type PersonnelCompositionTrendKind,
  type PersonnelCompositionTrendPoint,
} from "@/lib/personnel";

const TITLES = {
  gender: "Gender balance over time",
  age: "Age profile over time",
  tenure: "Length of service over time",
};

const percent = (value: number | null | undefined) =>
  value == null ? "Unavailable" : formatPercent(value);

export function PersonnelCompositionTrendsPlot({
  kind,
  trends: { data, loading, error, retry },
  scope,
  population,
}: {
  kind: PersonnelCompositionTrendKind;
  trends: PersonnelTrendsResource;
  scope: string | readonly string[];
  population: string;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const chart = data
    ? personnelCompositionTrend(data, kind, scope)
    : { series: [], points: [] };
  const visibleSeries =
    kind === "gender"
      ? chart.series.filter((series) => !hiddenSeries.includes(series.key))
      : chart.series;
  const points = chart.points.map((point, index, all) => ({
    ...point,
    isolated:
      point.total !== null &&
      point.total > 0 &&
      (index === 0 || all[index - 1].total === null) &&
      (index === all.length - 1 || all[index + 1].total === null),
  }));
  const hasData = chart.points.some(
    (point) => point.total !== null && point.total > 0,
  );
  return (
    <>
      <div
        className="mb-4 flex flex-wrap items-center gap-2"
        data-trend-legend
        aria-label={`${TITLES[kind]} legend`}
      >
        {chart.series.map((series) => (
          <LegendLabel
            key={series.key}
            label={series.label}
            color={series.color}
            variant="pill"
            selected={kind !== "gender" || !hiddenSeries.includes(series.key)}
            onToggle={
              kind === "gender"
                ? () =>
                    setHiddenSeries((hidden) =>
                      hidden.includes(series.key)
                        ? hidden.filter((key) => key !== series.key)
                        : [...hidden, series.key],
                    )
                : undefined
            }
          />
        ))}
      </div>
      {loading ? (
        <div
          role="status"
          className="flex h-72 items-center justify-center text-sm text-gray-600"
        >
          Loading personnel composition trends…
        </div>
      ) : error ? (
        <div role="alert" className="py-12 text-sm text-gray-600">
          Personnel composition trends could not be loaded.{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={retry}
          >
            Try again
          </button>
        </div>
      ) : !hasData ? (
        <p className="flex h-72 items-center justify-center text-sm text-gray-600">
          No composition trend records are available for this selection.
        </p>
      ) : visibleSeries.length === 0 ? (
        <p className="flex h-72 items-center justify-center text-sm text-gray-600">
          No series selected.
        </p>
      ) : (
        <div
          role="img"
          aria-label={`${TITLES[kind]} for ${population}, as percentages of reported staff`}
        >
          <ResponsiveContainer width="100%" height={TREND_CHART_HEIGHT}>
            <ComposedChart
              data={points}
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
                minTickGap={15}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => formatPercent(Number(value))}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={43}
              />
              <Tooltip
                position={{ x: 0, y: 0 }}
                wrapperStyle={{ maxWidth: "100%" }}
                isAnimationActive={false}
                content={({ active, label }) => {
                  const point = chart.points.find(
                    (point) => point.year === Number(label),
                  );
                  if (!active || !point || point.total === null) return null;
                  return (
                    <div className="max-w-sm rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 shadow-lg">
                      <p className="mb-2 font-semibold">
                        {point.year} · {formatPeople(point.total)} staff
                      </p>
                      {visibleSeries.map((series) => (
                        <p
                          key={series.key}
                          className="flex justify-between gap-5"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: series.color }}
                            />
                            {series.label}
                          </span>
                          <span className="whitespace-nowrap tabular-nums">
                            {formatPeople(point.counts?.[series.key] ?? 0)} ·{" "}
                            {percent(point.shares[series.key])}
                          </span>
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              {visibleSeries.map((series) => (
                <Area
                  key={series.key}
                  type="linear"
                  dataKey={(point: PersonnelCompositionTrendPoint) =>
                    point.shares[series.key]
                  }
                  name={series.label}
                  stackId="staff-share"
                  fill={series.color}
                  fillOpacity={0.9}
                  stroke={series.color}
                  strokeWidth={0.8}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={false}
                />
              ))}
              {visibleSeries.map((series) => (
                <Bar
                  key={`isolated-${series.key}`}
                  dataKey={(
                    point: PersonnelCompositionTrendPoint & {
                      isolated: boolean;
                    },
                  ) => (point.isolated ? point.shares[series.key] : null)}
                  name={series.label}
                  stackId="isolated-staff-share"
                  fill={series.color}
                  fillOpacity={0.9}
                  barSize={12}
                  isAnimationActive={false}
                  data-isolated-series={series.key}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
