"use client";

import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { TREND_CHART_HEIGHT } from "@/components/charts/trendLayout";
import {
  formatAssessmentCurrency as money,
  formatAssessmentDate as date,
} from "@/lib/regularBudgetContributors";
import {
  formatOutstandingPercent as percent,
  formatReportedOutstandingTotal,
  outstandingAmount,
  outstandingChange,
  outstandingSourceUrl,
  percentageOf,
  OUTSTANDING_TOTAL_COLOR,
  assignOutstandingCountryColors,
} from "@/lib/regularBudgetOutstanding";
import type {
  RegularBudgetContributorsData,
  RegularBudgetOutstandingData,
} from "@/types";

export type AssessmentFiles = Record<
  number,
  RegularBudgetContributorsData | null
>;

export function assessmentFor(
  files: AssessmentFiles,
  year: number,
  names: string[],
) {
  const file = files[year];
  if (!file) return null;
  if (!names.length) return file.meta.assessment_total;
  const amounts = names.map(
    (name) =>
      file.contributors.find((row) => row.name === name)?.assessment_amount,
  );
  return amounts.some((value) => value === undefined)
    ? null
    : amounts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function outstandingMetricRows(
  snapshot: RegularBudgetOutstandingData,
  previous: RegularBudgetOutstandingData | undefined,
  names: string[],
  files: AssessmentFiles,
  includeShareOfTotal = true,
  includeAssessment = true,
) {
  const amount = outstandingAmount(snapshot, names);
  const change = outstandingChange(amount, outstandingAmount(previous, names));
  return [
    ...(includeShareOfTotal
      ? [
          {
            label: "Share of reported total",
            value: percent(percentageOf(amount, outstandingAmount(snapshot))),
          },
        ]
      : []),
    ...(includeAssessment
      ? [
          {
            label: "Balance / annual assessment",
            value: percent(
              percentageOf(
                amount,
                assessmentFor(files, snapshot.meta.year, names),
              ),
            ),
          },
        ]
      : []),
    {
      label: "Change from previous year",
      value:
        change.amount === null
          ? "Unavailable"
          : `${change.amount > 0 ? "+" : ""}${money(change.amount)}`,
    },
    {
      label: "Change (%)",
      value: change.newBalance
        ? "New outstanding balance"
        : change.percent === null && change.amount === 0
          ? "–"
          : percent(change.percent, true),
    },
  ];
}

export function RegularBudgetOutstandingTrendsChart({
  rows,
  names = [],
  assessments,
  includeTotal = names.length === 0,
  countryColors,
  compact = false,
  variant = "bar",
  showShareOfTotal = true,
  showLegend = true,
}: {
  rows: RegularBudgetOutstandingData[];
  names?: string[];
  includeTotal?: boolean;
  countryColors?: Record<string, string>;
  assessments: AssessmentFiles;
  compact?: boolean;
  variant?: "bar" | "line";
  showShareOfTotal?: boolean;
  showLegend?: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltipBounds, setTooltipBounds] = useState({
    y: 0,
    maxHeight: compact ? 170 : 260,
  });
  const updateTooltipBounds = () => {
    const bounds = chartRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const y = Math.max(0, 8 - bounds.top);
    const maxHeight = Math.max(
      40,
      Math.min(
        compact ? 170 : 260,
        window.innerHeight - Math.max(8, bounds.top) - 8,
      ),
    );
    setTooltipBounds((current) =>
      current.y === y && current.maxHeight === maxHeight
        ? current
        : { y, maxHeight },
    );
  };
  const displayAmount = (
    snapshot: RegularBudgetOutstandingData,
    names: string[],
  ) => {
    if (!names.length) return formatReportedOutstandingTotal(snapshot);
    const amount = outstandingAmount(snapshot, names);
    return amount === null ? "Unavailable" : money(amount);
  };
  const data = rows.map((row) => ({
    year: String(row.meta.year),
    total: outstandingAmount(row),
    ...Object.fromEntries(
      names.map((name, index) => [
        `country${index}`,
        outstandingAmount(row, [name]),
      ]),
    ),
  }));
  const colors = countryColors ?? assignOutstandingCountryColors({}, names);
  const series = [
    ...(includeTotal
      ? [
          {
            key: "total",
            label: "All Member States",
            names: [] as string[],
            color: OUTSTANDING_TOTAL_COLOR,
          },
        ]
      : []),
    ...names.map((name, index) => ({
      key: `country${index}`,
      label: name,
      names: [name],
      color: variant === "bar" ? OUTSTANDING_TOTAL_COLOR : colors[name],
    })),
  ];
  const Chart = variant === "line" ? LineChart : BarChart;
  return (
    <div data-outstanding-trend>
      {showLegend && series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {series.map((item) => (
            <span key={item.key}>
              <span
                className="mr-1 inline-block size-2.5"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
      <div
        ref={chartRef}
        className="w-full"
        style={{ height: compact ? 190 : TREND_CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Chart
            data={data}
            margin={{ top: 16, right: 12, bottom: 4, left: 0 }}
            accessibilityLayer
            onMouseMove={updateTooltipBounds}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              tickFormatter={money}
              width={65}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              position={{ y: tooltipBounds.y }}
              wrapperStyle={{ pointerEvents: "auto", zIndex: 10 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as
                  | { year?: string }
                  | undefined;
                const year = Number(label || point?.year);
                const snapshot = rows.find((row) => row.meta.year === year);
                if (!snapshot) return null;
                const previous = rows.find((row) => row.meta.year === year - 1);
                return (
                  <div
                    data-outstanding-tooltip
                    role="region"
                    aria-label="Outstanding contributions details"
                    tabIndex={0}
                    className="w-[min(24rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded border border-gray-200 bg-white p-3 shadow-lg"
                    style={{ maxHeight: tooltipBounds.maxHeight }}
                  >
                    <p className="mb-2 text-sm font-semibold">
                      {year} · {date(snapshot.meta.as_of)}
                    </p>
                    {variant === "line" ? (
                      <div className="space-y-1.5">
                        {series.map((item) => (
                          <div
                            key={item.key}
                            data-outstanding-tooltip-series
                            className="flex items-center gap-2 text-sm whitespace-nowrap"
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: item.color }}
                              aria-hidden="true"
                            />
                            <span
                              className="min-w-0 flex-1 truncate"
                              title={item.label}
                            >
                              {item.label}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              {displayAmount(snapshot, item.names)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 divide-y divide-gray-200">
                          {series.map((item) => (
                            <div
                              key={item.key}
                              className="pt-2 first:pt-0"
                              data-outstanding-tooltip-series
                            >
                              <FinancialTooltip
                                title={item.label}
                                total={{
                                  label: "Outstanding contributions",
                                  value: displayAmount(snapshot, item.names),
                                }}
                                rows={outstandingMetricRows(
                                  snapshot,
                                  previous,
                                  item.names,
                                  assessments,
                                  showShareOfTotal,
                                  true,
                                )}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-gray-600">
                          Includes previous years’ arrears. Changes reflect
                          payments, credits and new assessments.
                        </p>
                      </>
                    )}
                  </div>
                );
              }}
            />
            {series.map((item) =>
              variant === "line" ? (
                <Line
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ) : (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  fill={item.color}
                  maxBarSize={38}
                  isAnimationActive={false}
                />
              ),
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      {rows.every((row) =>
        series.every((item) => outstandingAmount(row, item.names) === 0),
      ) && (
        <p className="text-sm text-gray-600">
          No outstanding balance at any available autumn snapshot.
        </p>
      )}
      <table className="sr-only">
        <caption>
          Outstanding regular-budget contributions at each autumn snapshot, US
          dollars
        </caption>
        <thead>
          <tr>
            <th>Year</th>
            <th>Reporting date</th>
            {series.map((item) => (
              <th key={item.key}>{item.label}</th>
            ))}
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.meta.year}>
              <th>{row.meta.year}</th>
              <td>{row.meta.as_of}</td>
              {series.map((item) => (
                <td key={item.key}>{displayAmount(row, item.names)}</td>
              ))}
              <td>
                <a href={outstandingSourceUrl(row)}>
                  Financial situation presentation
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
