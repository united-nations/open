"use client";

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
import { TREND_CHART_MARGIN } from "@/components/charts/trendLayout";
import { formatBudget } from "@/lib/contributors";
import { FINANCING_INSTRUMENT_COLORS } from "@/lib/financingInstruments";
import {
  PRIOR_ASSESSMENT_PAYMENT_COLOR,
  UNKNOWN_ASSESSMENT_PAYMENT_COLOR,
  type AssessmentAmount,
} from "@/lib/cebAssessments";

export interface AssessmentTrendPoint {
  year: number;
  assessed: AssessmentAmount;
  current: AssessmentAmount;
  prior: AssessmentAmount;
  unknownCurrent: number;
}

const assessedColor = FINANCING_INSTRUMENT_COLORS.assessed;
const currentColor = "var(--color-un-blue)";
const priorColor = PRIOR_ASSESSMENT_PAYMENT_COLOR;

function formatAssessmentAmount({ value, partial }: AssessmentAmount) {
  if (value === null) return "Unknown";
  return formatBudget(value) + (partial ? " (partial)" : "");
}

const unknownLabel = "Payment status unknown";

export function CebAssessmentTrendsChart({
  data,
}: {
  data: AssessmentTrendPoint[];
}) {
  const priorLabel = "Paid toward earlier years";
  const currentLabel = "Paid toward assessment year";
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
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <LegendLabel label="Assessed" color={assessedColor} />
        <LegendLabel label={currentLabel} color={currentColor} />
        {hasUnknown && (
          <LegendLabel
            label={unknownLabel}
            color={UNKNOWN_ASSESSMENT_PAYMENT_COLOR}
          />
        )}
        <LegendLabel label={priorLabel} color={priorColor} />
      </div>
      <ResponsiveContainer width="100%" height={225}>
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
              return (
                <div className="max-w-sm rounded-md border border-gray-200 bg-white px-3 py-2 shadow-lg">
                  <FinancialTooltip
                    title={String(point.year)}
                    rows={[
                      {
                        label: "Assessed",
                        color: assessedColor,
                        value: formatAssessmentAmount(point.assessed),
                      },
                      {
                        label: currentLabel,
                        color: currentColor,
                        value: formatAssessmentAmount(point.current),
                      },
                      ...(point.unknownCurrent > 0
                        ? [
                            {
                              label: unknownLabel,
                              color: UNKNOWN_ASSESSMENT_PAYMENT_COLOR,
                              value: formatBudget(point.unknownCurrent),
                            },
                          ]
                        : []),
                      {
                        label: priorLabel,
                        color: priorColor,
                        value: formatAssessmentAmount(point.prior),
                      },
                    ]}
                  />
                </div>
              );
            }}
          />
          <Area
            dataKey="current"
            name={currentLabel}
            stackId="receipts"
            stroke={currentColor}
            fill={currentColor}
            fillOpacity={0.5}
            dot={{ r: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="unknownCurrent"
            name={unknownLabel}
            stackId="receipts"
            stroke={UNKNOWN_ASSESSMENT_PAYMENT_COLOR}
            fill={UNKNOWN_ASSESSMENT_PAYMENT_COLOR}
            fillOpacity={0.5}
            isAnimationActive={false}
          />
          <Area
            dataKey="prior"
            name={priorLabel}
            stackId="receipts"
            stroke={priorColor}
            fill={priorColor}
            fillOpacity={0.5}
            dot={{ r: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="assessed"
            name="Assessed"
            stroke={assessedColor}
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
