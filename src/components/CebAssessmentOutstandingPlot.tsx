"use client";
import { formatBudgetTick } from "@un-eosg/ui/format-budget";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import {
  outstandingDate,
  outstandingHistory,
  outstandingSourceUrl,
  outstandingTrend,
} from "@/lib/cebAssessmentOutstanding";
import { formatBudget } from "@/lib/contributors";
import { OUTSTANDING_TOTAL_COLOR } from "@/lib/regularBudgetOutstanding";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";

export function CebAssessmentOutstandingPlot({
  history,
  entity,
  height = TREND_CHART_HEIGHT,
}: {
  history: ReturnType<typeof outstandingHistory>;
  entity: string;
  height?: number;
}) {
  const { points, multiple } = outstandingTrend(history);
  const years = history.map(({ data }) => data.year);
  return (
    <div
      role="img"
      aria-label={`${entity}: CEB-reported outstanding balances by reporting year, in US dollars.`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={points} margin={TREND_CHART_MARGIN}>
          <CartesianGrid vertical={false} stroke="var(--color-gray-200)" />
          <XAxis
            type="number"
            dataKey="year"
            ticks={years}
            domain={[years[0], years[years.length - 1]]}
            tick={{ fontSize: 11 }}
            tickFormatter={String}
          />
          <YAxis
            type="number"
            dataKey="amount"
            tickFormatter={formatBudgetTick}
            tick={{ fontSize: 11 }}
            width={58}
          />
          <Tooltip
            shared={false}
            content={({ active, payload }) => {
              const entry: (typeof points)[number] | undefined =
                payload?.[0]?.payload;
              if (!active || !entry?.record) return null;
              const { record, data } = entry;
              return (
                <div className="max-w-sm rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                  <FinancialTooltip
                    title={`${record.label} · ${data.year}`}
                    rows={[
                      {
                        label: "Reported outstanding",
                        value:
                          record.outstanding === null
                            ? "Unavailable"
                            : formatBudget(record.outstanding),
                        color: OUTSTANDING_TOTAL_COLOR,
                      },
                      { label: "As at", value: outstandingDate(record) },
                    ]}
                  />
                  <a
                    href={outstandingSourceUrl(data, record)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-xs underline"
                  >
                    {data.source.symbol}, Table {data.source.table}
                  </a>
                </div>
              );
            }}
          />
          {!multiple && (
            <Line
              dataKey="trend"
              stroke={OUTSTANDING_TOTAL_COLOR}
              dot={false}
              activeDot={false}
              connectNulls={false}
              tooltipType="none"
              isAnimationActive={false}
            />
          )}
          <Scatter
            name="Reported outstanding"
            data={points.filter(({ amount }) => amount !== null)}
            fill={OUTSTANDING_TOTAL_COLOR}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
