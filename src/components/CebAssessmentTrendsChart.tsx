"use client";

import { useCallback } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { useYearResource } from "@/hooks/useYearResource";
import { formatBudget } from "@/lib/contributors";
import {
  assessmentMeasures,
  CEB_ASSESSMENT_COLORS,
  formatAssessmentAmount,
  loadCebAssessments,
  systemAssessmentTrendPoint,
  type AssessmentAmount,
} from "@/lib/cebAssessments";
import { useYearRanges } from "@/lib/useYearRanges";

export interface AssessmentTrendPoint {
  year: number;
  assessed: AssessmentAmount;
  current: AssessmentAmount;
  prior: AssessmentAmount;
  unknownCurrent: number;
  notes?: string[];
}

const colors = CEB_ASSESSMENT_COLORS;
const measures = assessmentMeasures();

const unknownLabel = "Payment status unknown";

export function CebAssessmentTrendsChart({
  data,
  height = 225,
}: {
  data: AssessmentTrendPoint[];
  height?: number;
}) {
  const hasUnknown = data.some(({ unknownCurrent }) => unknownCurrent > 0);
  const plot = data.map(
    ({ year, assessed, current, prior, unknownCurrent }) => ({
      year,
      assessed: assessed.value,
      current: current.value,
      prior: prior.value,
      unknownCurrent: assessed.value === null ? null : unknownCurrent,
    }),
  );
  const unknownGaps = data.flatMap((point, index) =>
    point.current.value === null && point.unknownCurrent > 0
      ? [
          {
            year: point.year,
            start: data[index - 1]?.year ?? point.year,
            end: data[index + 1]?.year ?? point.year,
          },
        ]
      : [],
  );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <LegendLabel {...measures.assessed} color={colors.assessed} />
        <LegendLabel {...measures.current} color={colors.current} />
        {hasUnknown && (
          <LegendLabel label={unknownLabel} color={colors.unknown} />
        )}
        <LegendLabel {...measures.prior} color={colors.prior} />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={plot}
          margin={TREND_CHART_MARGIN}
          stackOffset="sign"
        >
          <CartesianGrid vertical={false} stroke="var(--color-gray-200)" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={formatBudget}
            tick={{ fontSize: 11 }}
            width={58}
          />
          <Tooltip
            content={({ active, label }) => {
              const point = data.find(({ year }) => year === Number(label));
              if (!active || !point) return null;
              const pointMeasures = assessmentMeasures(point.year);
              return (
                <div className="max-w-sm rounded-md border border-gray-200 bg-white px-3 py-2 shadow-lg">
                  <FinancialTooltip
                    title={String(point.year)}
                    notes={
                      point.notes?.length
                        ? point.notes.map((note) => <p key={note}>{note}</p>)
                        : undefined
                    }
                    rows={[
                      {
                        label: pointMeasures.assessed.label,
                        color: colors.assessed,
                        value: formatAssessmentAmount(point.assessed),
                      },
                      {
                        label: pointMeasures.current.label,
                        color: colors.current,
                        value: formatAssessmentAmount(point.current),
                      },
                      ...(point.unknownCurrent > 0
                        ? [
                            {
                              label: unknownLabel,
                              color: colors.unknown,
                              value: formatBudget(point.unknownCurrent),
                            },
                          ]
                        : []),
                      {
                        label: pointMeasures.prior.label,
                        color: colors.prior,
                        value: formatAssessmentAmount(point.prior),
                      },
                    ]}
                  />
                </div>
              );
            }}
          />
          {/* Green stops at missing observations. Extend grey to the baseline
              across those gaps instead of tapering the paid fill toward zero. */}
          {unknownGaps.map(({ year, start, end }) => (
            <Area
              key={year}
              dataKey={(point: (typeof plot)[number]) =>
                point.year >= start && point.year <= end
                  ? Math.max(0, point.current ?? 0)
                  : null
              }
              name={unknownLabel}
              stroke="none"
              fill={colors.unknown}
              fillOpacity={0.5}
              dot={false}
              activeDot={false}
              tooltipType="none"
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          <Area
            dataKey="current"
            name={measures.current.label}
            stackId="receipts"
            stroke={colors.current}
            fill={colors.current}
            fillOpacity={0.5}
            dot={{ r: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {hasUnknown && (
            <Area
              dataKey="unknownCurrent"
              name={unknownLabel}
              stackId="receipts"
              stroke={colors.unknown}
              fill={colors.unknown}
              fillOpacity={0.5}
              dot={{ r: 2 }}
              isAnimationActive={false}
            />
          )}
          <Area
            dataKey="prior"
            name={measures.prior.label}
            stackId="receipts"
            stroke={colors.prior}
            fill={colors.prior}
            fillOpacity={0.5}
            dot={{ r: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="assessed"
            name={measures.assessed.label}
            stroke={colors.assessed}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CebSystemAssessmentTrends() {
  const { years } = useYearRanges().cebAssessments;
  const load = useCallback(async () => {
    const datasets = await Promise.all(years.map(loadCebAssessments));
    return datasets.map(systemAssessmentTrendPoint);
  }, [years]);
  const { value, loading, error } = useYearResource(
    years.join(","),
    null,
    false,
    load,
    null,
  );

  if (loading || error) {
    return (
      <p role="status" className="text-sm text-gray-600">
        {loading
          ? "Loading assessment trends…"
          : "Assessment trends could not be loaded."}
      </p>
    );
  }
  return value?.some(({ assessed }) => assessed.value !== null) ? (
    <CebAssessmentTrendsChart data={value} height={TREND_CHART_HEIGHT} />
  ) : (
    <p className="text-sm text-gray-600">No assessment trends available.</p>
  );
}
