"use client";
import { useMoneyBasis } from "@/hooks/useMoneyBasis";
import { MoneyBasisControl } from "./MoneyBasisControl";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { SourceAwareTrendTooltip } from "./SourceAwareTrendTooltip";
import { FinancialChartTooltip } from "./FinancialChartTooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import type { BudgetNodeSource } from "@/types";
import { useState } from "react";
import { fundingSources } from "@un-eosg/ui/funding-sources";
import { FinancingInstrumentLabel } from "../FinancingInstrumentLabel";

import {
  AreaChart,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getFinancingInstrumentLabel,
  FINANCING_SOURCE_KEYS,
  FINANCING_INSTRUMENT_COLORS,
  FINANCING_INSTRUMENT_TOOLTIPS,
} from "@/lib/financingInstruments";

export interface FinancingInstrumentDataPoint {
  year: string;
  [key: string]: number | string | null;
}

export interface FinancingSeries {
  key: string;
  label: string;
  color: string;
  tooltip?: string;
}

// Default series = the CEB revenue financing instruments (4 categories).
const DEFAULT_SERIES: FinancingSeries[] = [
  {
    key: "Assessed",
    label: "Assessed",
    color: FINANCING_INSTRUMENT_COLORS.assessed,
    tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Assessed"],
  },
  {
    key: "Voluntary un-earmarked",
    label: "Voluntary un-earmarked",
    color: FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked,
    tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Voluntary un-earmarked"],
  },
  {
    key: "Voluntary earmarked",
    label: "Voluntary earmarked",
    color: FINANCING_INSTRUMENT_COLORS.voluntary_earmarked,
    tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Voluntary earmarked"],
  },
  {
    key: "Other",
    label: "Other",
    color: FINANCING_INSTRUMENT_COLORS.other,
    tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Other"],
  },
];

interface FinancingInstrumentChartProps {
  data: FinancingInstrumentDataPoint[];
  /** Stacked series to render. Defaults to the CEB 4-category revenue scheme. */
  series?: FinancingSeries[];
  height?: number;
  showLegend?: boolean;
  legendClassName?: string;
  compact?: boolean;
  filterable?: boolean;
  yAxisMax?: number;
  /** Allow signed net series, such as contribution adjustments. */
  allowNegative?: boolean;
  variant?: "area" | "bar";
  tooltipValueFormatter?: (value: number) => string;
  showTooltipTotal?: boolean;
  valueFormatter?: (value: number) => string;
  tooltipSources?: (year: string, visibleKeys: string[]) => BudgetNodeSource[];
  /** Counts and percentages must opt out of monetary conversion. */
  monetary?: boolean;
  accessibleTableLabel?: string;
}

const formatYAxis = sharedFormatBudget;

function LegendChip({
  type,
  color,
  tooltip,
}: {
  type: string;
  color: string;
  tooltip?: string;
}) {
  if (FINANCING_SOURCE_KEYS[type])
    return <FinancingInstrumentLabel type={type} variant="pill" />;
  const chip = (
    <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{type}</span>
    </div>
  );
  if (!tooltip) return chip;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className="cursor-help">{chip}</div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="max-w-[250px] border border-slate-200 bg-white text-slate-800 shadow-lg"
      >
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function FinancingInstrumentChart({
  data,
  height = TREND_CHART_HEIGHT,
  showLegend = true,
  legendClassName = "",
  compact = false,
  series = DEFAULT_SERIES,
  filterable = false,
  valueFormatter,
  yAxisMax,
  tooltipValueFormatter,
  showTooltipTotal = false,
  allowNegative = false,
  variant = "area",
  tooltipSources,
  monetary = true,
  accessibleTableLabel,
}: FinancingInstrumentChartProps) {
  const money = useMoneyBasis(
    data,
    series.map((item) => item.key),
    monetary,
  );
  const displayMax = money.basis === "adjusted" ? undefined : yAxisMax;
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  // Include signed net series when requested; otherwise require a positive value.
  const activeSeries = series.filter((s) =>
    data.some(
      (d) =>
        typeof d[s.key] === "number" &&
        (allowNegative ? (d[s.key] as number) !== 0 : (d[s.key] as number) > 0),
    ),
  );

  const visibleSeries = activeSeries.filter(
    (s) => !filterable || !hiddenKeys.includes(s.key),
  );

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const Chart = variant === "bar" ? BarChart : AreaChart;
  const chartHeight = compact ? 180 : height;

  return (
    <div className="flex flex-col" data-money-chart>
      {monetary && (
        <MoneyBasisControl
          basis={money.basis}
          onChange={money.setBasis}
          missingPeriods={money.missingPeriods}
        />
      )}
      {showLegend && (
        <div
          className={`mb-3 flex flex-wrap gap-2 ${legendClassName}`}
          role={filterable ? "group" : undefined}
          aria-label={filterable ? "Trend filters" : undefined}
        >
          {activeSeries.map((s) =>
            filterable ? (
              <LegendLabel
                key={s.key}
                label={getFinancingInstrumentLabel(s.label)}
                color={s.color}
                explanation={
                  s.tooltip ??
                  fundingSources[FINANCING_SOURCE_KEYS[s.label]]?.explanation
                }
                selected={!hiddenKeys.includes(s.key)}
                onToggle={() =>
                  setHiddenKeys((current) =>
                    current.includes(s.key)
                      ? current.filter((key) => key !== s.key)
                      : [...current, s.key],
                  )
                }
              />
            ) : (
              <LegendChip
                key={s.key}
                type={s.label}
                color={s.color}
                tooltip={s.tooltip}
              />
            ),
          )}
        </div>
      )}
      <div style={{ height: chartHeight }} className="w-full">
        {visibleSeries.length === 0 ? (
          <div
            className="flex h-full items-center justify-center text-sm text-gray-500"
            role="status"
          >
            Select a category to show the trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={money.data} margin={TREND_CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: compact ? 10 : 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                orientation="right"
                width={1}
                tick={{
                  fontSize: compact ? 9 : 11,
                  fill: "#6b7280",
                  dx: -5,
                  dy: -8,
                }}
                tickLine={false}
                axisLine={false}
                domain={[allowNegative ? "auto" : 0, displayMax ?? "auto"]}
                ticks={
                  displayMax
                    ? Array.from(
                        { length: 5 },
                        (_, index) => (displayMax * index) / 4,
                      )
                    : undefined
                }
                tickFormatter={valueFormatter ?? formatYAxis}
                mirror
              />
              <SourceAwareTrendTooltip
                key={`${money.basis}-${visibleSeries.map((series) => series.key).join("|")}`}
                interactive={Boolean(tooltipSources)}
                content={(props) => (
                  <FinancialChartTooltip
                    {...props}
                    unitLabel={money.unitLabel}
                    payload={props.payload?.map((entry) => ({
                      ...entry,
                      color:
                        visibleSeries.find(
                          (series) => series.key === entry.dataKey,
                        )?.color ?? entry.color,
                    }))}
                    formatValue={
                      tooltipValueFormatter ?? valueFormatter ?? formatYAxis
                    }
                    totalLabel={showTooltipTotal ? "Selected total" : undefined}
                    showBars
                    sources={tooltipSources?.(
                      String(props.label ?? ""),
                      visibleSeries.map((series) => series.key),
                    )}
                  />
                )}
              />
              {visibleSeries.map((s) =>
                variant === "bar" ? (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={getFinancingInstrumentLabel(s.label)}
                    fill={s.color}
                    stackId="1"
                    maxBarSize={32}
                    radius={4}
                  />
                ) : (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={getFinancingInstrumentLabel(s.label)}
                    stackId="1"
                    stroke="white"
                    strokeWidth={2}
                    fill={s.color}
                    fillOpacity={1}
                  />
                ),
              )}
            </Chart>
          </ResponsiveContainer>
        )}
      </div>
      {accessibleTableLabel && (
        <table className="sr-only">
          <caption>
            {accessibleTableLabel}, {money.unitLabel ?? "nominal US dollars"}
          </caption>
          <thead>
            <tr>
              <th>Year</th>
              {visibleSeries.map((item) => (
                <th key={item.key}>{item.label}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {money.data.map((row) => (
              <tr key={row.year}>
                <th scope="row">{row.year}</th>
                {visibleSeries.map((item) => (
                  <td key={item.key}>
                    {typeof row[item.key] === "number"
                      ? (valueFormatter ?? formatYAxis)(Number(row[item.key]))
                      : "Unavailable"}
                  </td>
                ))}
                <td>
                  {visibleSeries.some(
                    (item) => typeof row[item.key] === "number",
                  )
                    ? (valueFormatter ?? formatYAxis)(
                        visibleSeries.reduce(
                          (sum, item) =>
                            sum +
                            (typeof row[item.key] === "number"
                              ? Number(row[item.key])
                              : 0),
                          0,
                        ),
                      )
                    : "Unavailable"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
