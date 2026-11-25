"use client";
import { formatPercent, formatBudgetTick } from "@un-eosg/ui/format-budget";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { SourceAwareTrendTooltip } from "./SourceAwareTrendTooltip";
import { FinancialChartTooltip } from "./FinancialChartTooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import type { BudgetNodeSource } from "@/types";
import { sourcePages, sourcePageUrl } from "@/lib/sourceReferences";
import { useId, useState } from "react";
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
  /** Compact legend text; tooltips and accessible tables retain the full label. */
  legendLabel?: string;
  color: string;
  tooltip?: string;
}

// Four reported financing types plus a conditional unresolved display series.
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
  {
    key: "Unresolved",
    label: "Unresolved",
    color: FINANCING_INSTRUMENT_COLORS.unresolved,
    tooltip: FINANCING_INSTRUMENT_TOOLTIPS.Unresolved,
  },
];

interface FinancingInstrumentChartProps {
  data: FinancingInstrumentDataPoint[];
  /** Stacked series to render. Defaults to reported financing types plus unresolved amounts when present. */
  series?: FinancingSeries[];
  height?: number;
  showLegend?: boolean;
  legendClassName?: string;
  compact?: boolean;
  filterable?: boolean;
  /** Series hidden by controls outside the chart. */
  hiddenSeriesKeys?: readonly string[];
  emptySelectionMessage?: string;
  showShareToggle?: boolean;
  absoluteUnit?: "$" | "#";
  yAxisMax?: number;
  /** Allow signed net series, such as contribution adjustments. */
  allowNegative?: boolean;
  /** Omit negative values from the stack while retaining them in the tooltip and table. */
  omitNegativeFromPlot?: boolean;
  /** Cumulative stacking lets reconciliation balances subtract from the total. */
  stackOffset?: "none" | "sign";
  variant?: "area" | "bar";
  tooltipValueFormatter?: (value: number) => string;
  showTooltipTotal?: boolean;
  valueFormatter?: (value: number) => string;
  tooltipSources?: (year: string, visibleKeys: string[]) => BudgetNodeSource[];
  accessibleTableLabel?: string;
  currencyLabel?: string;
}

const formatYAxis = sharedFormatBudget;
const NEGATIVE_NOTE_THRESHOLD = 0.01;
const shareTicks = [0, 25, 50, 75, 100];
const formatShare = (value: number) => formatPercent(value);

function LegendChip({
  type,
  color,
  tooltip,
}: {
  type: string;
  color: string;
  tooltip?: string;
}) {
  if (FINANCING_SOURCE_KEYS[type] || type === "Unresolved")
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
  hiddenSeriesKeys,
  emptySelectionMessage = "Select a category to show the trend.",
  showShareToggle = false,
  absoluteUnit = "$",
  valueFormatter,
  yAxisMax,
  tooltipValueFormatter,
  showTooltipTotal = false,
  allowNegative = false,
  omitNegativeFromPlot = false,
  stackOffset,
  variant = "area",
  tooltipSources,
  accessibleTableLabel,
  currencyLabel = "nominal US dollars",
}: FinancingInstrumentChartProps) {
  const displayMax = yAxisMax;
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState("absolute");
  const unitGroup = useId();
  const showShare = showShareToggle && displayMode === "share";
  // Include signed net series when requested; otherwise require a positive value.
  const activeSeries = series.filter((s) =>
    data.some(
      (d) =>
        typeof d[s.key] === "number" &&
        (allowNegative ? (d[s.key] as number) !== 0 : (d[s.key] as number) > 0),
    ),
  );

  const visibleSeries = activeSeries.filter(
    (s) =>
      !hiddenSeriesKeys?.includes(s.key) &&
      (!filterable || !hiddenKeys.includes(s.key)),
  );
  const showNegativeNote =
    showShareToggle &&
    omitNegativeFromPlot &&
    data.some((row) => {
      let positive = 0;
      let negative = 0;
      for (const { key } of visibleSeries) {
        const value = row[key];
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        positive += Math.max(0, value);
        negative += Math.max(0, -value);
      }
      // Compare the omitted amount to the positive stack for the same year.
      return negative > 0 && negative >= positive * NEGATIVE_NOTE_THRESHOLD;
    });
  const plotData =
    showShare || omitNegativeFromPlot
      ? data.map((row) => {
          const point = { ...row };
          // Use the full annual breakdown even when some categories are hidden.
          const values = series.map(({ key }) => row[key]);
          const total =
            showShare &&
            values.every(
              (value) =>
                typeof value === "number" &&
                Number.isFinite(value) &&
                (omitNegativeFromPlot || value >= 0),
            )
              ? values.reduce<number>(
                  (sum, value) => sum + Math.max(0, Number(value)),
                  0,
                )
              : 0;
          for (const { key } of series) {
            const value = row[key];
            if (showShare) {
              point[key] =
                total > 0 && typeof value === "number"
                  ? (Math.max(0, value) / total) * 100
                  : null;
            } else if (typeof value === "number" && value < 0) {
              point[key] = 0;
            }
          }
          return point;
        })
      : data;
  const offset = showShare
    ? "none"
    : (stackOffset ?? (allowNegative ? "sign" : "none"));
  // Pin signed domains to the actual stack extent. An automatic domain can
  // round a tiny negative balance down to a full, misleading negative tick.
  const stackExtents = plotData.map((row) => {
    let positive = 0;
    let negative = 0;
    let cumulative = 0;
    let minimum = 0;
    let maximum = 0;
    for (const series of visibleSeries) {
      const value = row[series.key];
      if (typeof value !== "number") continue;
      if (offset === "sign") {
        positive += Math.max(0, value);
        negative += Math.min(0, value);
        minimum = negative;
        maximum = positive;
      } else {
        cumulative += value;
        minimum = Math.min(minimum, cumulative);
        maximum = Math.max(maximum, cumulative);
      }
    }
    return { minimum, maximum };
  });
  const signedMinimum = Math.min(0, ...stackExtents.map((row) => row.minimum));
  const signedMaximum = Math.max(0, ...stackExtents.map((row) => row.maximum));

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const Chart = variant === "bar" ? BarChart : AreaChart;
  const chartHeight = compact ? 180 : height;
  const formatTooltipValue =
    tooltipValueFormatter ?? valueFormatter ?? formatYAxis;

  function shareDetail(
    amount: number,
    share: FinancingInstrumentDataPoint[string] | undefined,
  ) {
    if (omitNegativeFromPlot && amount < 0) return "Excluded from share";
    return typeof share === "number" ? formatShare(share) : "Share unavailable";
  }

  function tableAmount(
    year: string,
    keys: string[],
    value: number,
    label: string,
    detail?: string,
  ) {
    const formatted = (valueFormatter ?? formatYAxis)(value);
    const amount = detail ? `${formatted} · ${detail}` : formatted;
    if (!tooltipSources) return amount;
    const pages = new Map<string, { symbol: string; page: number }>();
    for (const source of tooltipSources(year, keys)) {
      for (const page of sourcePages(source)) {
        pages.set(sourcePageUrl(source.url, page), {
          symbol: source.symbol || "Source document",
          page,
        });
      }
    }
    if (!pages.size)
      return (
        <>
          {amount} <span>Source page unavailable</span>
        </>
      );
    return [...pages].map(([href, source], index) => (
      <a
        key={href}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="me-2 text-un-blue underline"
        aria-label={`${year} ${label}, ${amount}; supporting source: ${source.symbol}, PDF page ${source.page} (opens in a new tab)`}
      >
        {index === 0 ? amount : `${source.symbol}, PDF p. ${source.page}`}
      </a>
    ));
  }

  return (
    <div className="flex flex-col" data-money-chart>
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
                label={s.legendLabel ?? getFinancingInstrumentLabel(s.label)}
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
      <div style={{ height: chartHeight }} className="relative w-full">
        {showShareToggle && (
          <fieldset className="absolute start-3 top-3 z-10 flex w-fit overflow-hidden rounded-full border border-slate-300 bg-white">
            <legend className="sr-only">
              {accessibleTableLabel
                ? `${accessibleTableLabel} units`
                : "Trend units"}
            </legend>
            {[
              {
                mode: "absolute",
                symbol: absoluteUnit,
                label: "Absolute values",
              },
              {
                mode: "share",
                symbol: "%",
                label: "Share of the annual total",
              },
            ].map(({ mode, symbol, label }) => (
              <label
                key={mode}
                className="relative cursor-pointer last:border-s last:border-slate-300"
                title={label}
              >
                <input
                  type="radio"
                  name={unitGroup}
                  checked={displayMode === mode}
                  onChange={() => setDisplayMode(mode)}
                  aria-label={label}
                  className="peer sr-only"
                />
                <span className="grid h-6 w-7 place-items-center text-xs text-slate-600 peer-checked:bg-slate-200 peer-checked:font-semibold peer-checked:text-slate-900 peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-un-blue">
                  {symbol}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {visibleSeries.length === 0 ? (
          <div
            className="flex h-full items-center justify-center text-sm text-gray-500"
            role="status"
          >
            {emptySelectionMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Chart
              // Re-register areas in series order when filters change; restored
              // series otherwise append to Recharts' internal stack registry.
              key={`${displayMode}:${visibleSeries.map((series) => series.key).join("|")}`}
              data={plotData}
              margin={TREND_CHART_MARGIN}
              stackOffset={offset}
            >
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
                  dy: allowNegative && !showShare ? -2 : -8,
                }}
                tickLine={false}
                axisLine={false}
                domain={
                  showShare
                    ? [0, 100]
                    : allowNegative
                      ? [signedMinimum, displayMax ?? (signedMaximum || 1)]
                      : [0, displayMax ?? "auto"]
                }
                allowDataOverflow={showShare}
                ticks={
                  showShare
                    ? shareTicks
                    : displayMax
                      ? Array.from(
                          { length: 5 },
                          (_, index) => (displayMax * index) / 4,
                        )
                      : undefined
                }
                tickFormatter={(value: number) =>
                  (showShare
                    ? formatShare
                    : (valueFormatter ?? formatBudgetTick))(value).replaceAll(
                    " ",
                    "\u00a0",
                  )
                }
                mirror
              />
              <SourceAwareTrendTooltip
                key={`${visibleSeries.map((series) => series.key).join("|")}`}
                interactive={Boolean(tooltipSources)}
                constrainToViewport={visibleSeries.length > 10}
                filterNull={!showShare}
                content={(props) => {
                  const year = String(props.label ?? "");
                  const index =
                    showShare || omitNegativeFromPlot
                      ? data.findIndex((row) => row.year === year)
                      : -1;
                  const reported = data[index];
                  const plotted = plotData[index];
                  return (
                    <FinancialChartTooltip
                      {...props}
                      payload={props.payload?.map((entry) => {
                        const series = visibleSeries.find(
                          (series) => series.key === entry.dataKey,
                        );
                        const value =
                          series && reported
                            ? reported[series.key]
                            : entry.value;
                        return {
                          ...entry,
                          value,
                          color: series?.color ?? entry.color,
                          formattedValue:
                            showShare && series && typeof value === "number"
                              ? `${formatTooltipValue(value)} · ${shareDetail(value, plotted?.[series.key])}`
                              : undefined,
                        };
                      })}
                      formatValue={formatTooltipValue}
                      totalLabel={
                        showTooltipTotal ? "Selected total" : undefined
                      }
                      showBars={!showShare && !omitNegativeFromPlot}
                      sources={tooltipSources?.(
                        year,
                        visibleSeries.map((series) => series.key),
                      )}
                    />
                  );
                }}
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
                    connectNulls={false}
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
      {showNegativeNote && (
        <p className="mt-2 text-xs text-gray-500">
          Negative amounts are not shown in the chart but included in tooltips.
        </p>
      )}
      {accessibleTableLabel && (
        <div className="sr-only focus-within:not-sr-only focus-within:mt-3 focus-within:max-w-full focus-within:overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption>
              {accessibleTableLabel}, {currencyLabel}
              {showShare && " and shares of the annual total"}
            </caption>
            <thead>
              <tr>
                <th>Year</th>
                {visibleSeries.map((item) => (
                  <th key={item.key}>
                    {item.key === "Unresolved"
                      ? getFinancingInstrumentLabel(item.key)
                      : item.label}
                  </th>
                ))}
                <th>Total{tooltipSources && " (sum of displayed series)"}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  {visibleSeries.map((item) => (
                    <td key={item.key}>
                      {typeof row[item.key] === "number"
                        ? tableAmount(
                            row.year,
                            [item.key],
                            Number(row[item.key]),
                            item.label,
                            showShare
                              ? shareDetail(
                                  Number(row[item.key]),
                                  plotData[index][item.key],
                                )
                              : undefined,
                          )
                        : "Unavailable"}
                    </td>
                  ))}
                  <td>
                    {visibleSeries.every(
                      (item) => typeof row[item.key] === "number",
                    )
                      ? tableAmount(
                          row.year,
                          visibleSeries.map((item) => item.key),
                          visibleSeries.reduce(
                            (sum, item) =>
                              sum +
                              (typeof row[item.key] === "number"
                                ? Number(row[item.key])
                                : 0),
                            0,
                          ),
                          "Calculated total",
                        )
                      : "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
