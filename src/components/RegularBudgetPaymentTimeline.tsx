"use client";

import { useMemo } from "react";
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
import { ExpandableCard } from "@/components/ExpandableCard";
import type { RegularBudgetContributorsData } from "@/types";

interface TimelinePoint {
  date: number;
  percent: number;
  amount: number;
  countries: number;
}

function currency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function dateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function RegularBudgetPaymentTimeline({
  data,
}: {
  data: RegularBudgetContributorsData;
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

  const finalPoint = points.at(-1);

  return (
    <div className="mt-8 border-t border-gray-200 pt-4">
      <ExpandableCard
        id="regular-budget-payment-timing"
        title="When were regular-budget assessments paid in full?"
      >
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-gray-600">
          The curve adds a Member State&apos;s full assessment on the date it
          appears as paid in full. Partial payments are not available from the
          honour roll and are therefore not estimated.
        </p>
        <div
          className="h-80 w-full"
          role="img"
          aria-label="Cumulative share of regular-budget assessments paid in full from January to December"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 16, right: 24, bottom: 8, left: 0 }}
            >
              <defs>
                <linearGradient
                  id="payment-timeline-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#009EDB" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#009EDB" stopOpacity={0.05} />
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
                  dateLabel(value).split(" ")[0]
                }
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value: number) => `${value}%`}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <RechartsTooltip
                labelFormatter={(value) => dateLabel(Number(value))}
                formatter={(value, name, item) => {
                  const point = item.payload as TimelinePoint;
                  if (name === "percent") {
                    return [
                      `${Number(value).toFixed(1)}% · ${currency(point.amount)} · ${point.countries} countries`,
                      "Paid in full",
                    ];
                  }
                  return [value, name];
                }}
              />
              <ReferenceLine
                x={dueDate}
                stroke="#004987"
                strokeDasharray="5 4"
                label={{
                  value: "Payment deadline",
                  position: "insideTopRight",
                  fill: "#004987",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={100}
                stroke="#374151"
                strokeDasharray="5 4"
                label={{
                  value: "100% target",
                  position: "insideTopLeft",
                  fill: "#374151",
                  fontSize: 11,
                }}
              />
              <Area
                type="stepAfter"
                dataKey="percent"
                stroke="#009EDB"
                strokeWidth={2.5}
                fill="url(#payment-timeline-fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          As of {dateLabel(Date.parse(`${data.meta.as_of}T00:00:00Z`))},{" "}
          {finalPoint?.percent.toFixed(1)}% of assessed dollars from{" "}
          {finalPoint?.countries} Member States had been listed as paid in full.
          The chart marks the 100% target even when it was not reached.
        </p>
      </ExpandableCard>
    </div>
  );
}
