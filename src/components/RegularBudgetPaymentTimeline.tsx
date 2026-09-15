"use client";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import {
  usePaymentChartScale,
  paymentScaleMaximum,
} from "@/components/PaymentChartScale";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelProps } from "recharts";
import type { RegularBudgetContributorsData } from "@/types";

interface TimelinePoint {
  date: number;
  percent: number;
  amount: number;
  countries: number;
}

const currency = sharedFormatBudget;

function dateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function PaymentDeadlineLabel({ viewBox }: LabelProps) {
  if (!viewBox || !("x" in viewBox) || !("y" in viewBox)) return null;
  const height = "height" in viewBox ? viewBox.height : 0;
  return (
    <text
      x={viewBox.x + 6}
      y={viewBox.y + height * 0.5}
      fill="var(--color-un-green-shade)"
      fontSize={11}
      textAnchor="start"
      dominantBaseline="middle"
    >
      Payment deadline
    </text>
  );
}

export function RegularBudgetPaymentTimeline({
  data,
  measure = "amount",
}: {
  data: RegularBudgetContributorsData;
  measure?: "amount" | "count";
}) {
  const { points, monthTicks, dueDate, yearEnd } = useMemo(() => {
    const year = data.meta.year;
    const start = Date.UTC(year, 0, 1);
    const yearEnd = Date.UTC(year, 11, 31);
    const reportedThrough = Math.min(
      yearEnd,
      Date.parse(`${data.meta.as_of}T00:00:00Z`),
    );
    const paid = data.contributors
      .filter((item) => item.payment_date)
      .map((item) => ({
        date: Date.parse(`${item.payment_date}T00:00:00Z`),
        amount: item.assessment_amount,
      }))
      .sort((a, b) => a.date - b.date);
    const result: TimelinePoint[] = [];
    let amount = 0;
    let countries = 0;
    let paymentIndex = 0;
    for (let date = start; date <= reportedThrough; date += 86_400_000) {
      while (paymentIndex < paid.length && paid[paymentIndex].date <= date) {
        amount += paid[paymentIndex].amount;
        countries += 1;
        paymentIndex += 1;
      }
      result.push({
        date,
        amount,
        countries,
        percent:
          data.meta.assessment_total > 0
            ? (amount / data.meta.assessment_total) * 100
            : 0,
      });
    }
    return {
      points: result,
      monthTicks: Array.from({ length: 12 }, (_, month) =>
        Date.UTC(year, month, 1),
      ),
      dueDate: Date.parse(`${data.meta.due_date}T00:00:00Z`),
      yearEnd,
    };
  }, [data]);

  const sharedScale = usePaymentChartScale();
  const target =
    measure === "count" ? data.contributors.length : data.meta.assessment_total;
  const yAxisMax =
    sharedScale?.scales?.[measure] ?? paymentScaleMaximum(target);
  const finalPoint = points.at(-1);
  const gradientId = useId().replace(/:/g, "");
  const firstDate = points[0]?.date ?? dueDate;
  const lastDate = finalPoint?.date ?? firstDate;
  const deadlineOffset =
    lastDate > firstDate
      ? Math.max(0, Math.min(1, (dueDate - firstDate) / (lastDate - firstDate)))
      : 1;

  return (
    <div id="regular-budget-payment-timing">
      <div
        className="w-full"
        style={{ height: TREND_CHART_HEIGHT }}
        role="img"
        aria-label={
          measure === "count"
            ? "Cumulative Member States listed as paid in full"
            : "Cumulative assessments of Member States listed as paid in full"
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={TREND_CHART_MARGIN}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset={deadlineOffset}
                  stopColor="var(--color-un-green-shade)"
                />
                <stop
                  offset={deadlineOffset}
                  stopColor="var(--color-un-green)"
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis
              dataKey="date"
              type="number"
              domain={[points[0]?.date ?? 0, yearEnd]}
              ticks={monthTicks}
              tickFormatter={(value: number) =>
                new Intl.DateTimeFormat("en-GB", {
                  month: "short",
                  timeZone: "UTC",
                }).format(value)
              }
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              orientation="right"
              mirror
              domain={[0, yAxisMax]}
              ticks={Array.from(
                { length: 5 },
                (_, index) => (yAxisMax * index) / 4,
              )}
              tickFormatter={(value: number) =>
                measure === "count"
                  ? String(Math.round(value))
                  : sharedFormatBudget(value)
              }
              tick={{ fontSize: 11, fill: "#6b7280", dx: -5, dy: -8 }}
              axisLine={false}
              tickLine={false}
              width={1}
            />
            <RechartsTooltip
              labelFormatter={(value) => dateLabel(Number(value))}
              formatter={(value) => [
                measure === "count"
                  ? `${Number(value)} Member States`
                  : currency(Number(value)),
                "Listed as paid in full",
              ]}
            />
            <ReferenceLine
              x={dueDate}
              stroke="var(--color-un-green-shade)"
              strokeDasharray="5 4"
              label={{ content: PaymentDeadlineLabel }}
            />
            <ReferenceLine
              y={target}
              stroke="#374151"
              strokeDasharray="5 4"
              label={{
                value:
                  measure === "count"
                    ? `All Member States: ${target}`
                    : `Total assessed: ${currency(target)}`,
                position: "insideTopRight",
                dx: -55,
                fill: "#374151",
                fontSize: 11,
              }}
            />
            <Area
              type="stepAfter"
              dataKey={measure === "count" ? "countries" : "amount"}
              stroke={`url(#${gradientId})`}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        As of {dateLabel(Date.parse(`${data.meta.as_of}T00:00:00Z`))},{" "}
        {finalPoint?.percent.toFixed(1)}% of assessed dollars from{" "}
        {finalPoint?.countries} Member States had been listed as paid in full.
        Each full assessment is included on the date the Member State is listed
        as paid in full. Partial payments are not shown.
      </p>
    </div>
  );
}
