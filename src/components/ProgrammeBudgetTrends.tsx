"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import type { BudgetData, BudgetMetricKey } from "@/types";

const METRICS: Array<{
  key: BudgetMetricKey;
  label: string;
  color: string;
  years: number[];
}> = [
  {
    key: "proposed",
    label: "Proposed",
    color: "#009edb",
    years: [2021, 2022, 2023, 2024, 2025, 2026, 2027],
  },
  {
    key: "approved",
    label: "Approved",
    color: "#2d6a7e",
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    key: "expenditure",
    label: "Expenditure",
    color: "#4a7c7e",
    years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
  },
];

const DATASETS: Record<
  BudgetMetricKey,
  "budget-ppb-proposed" | "budget-ppb-approved" | "budget-ppb-expenditure"
> = {
  proposed: "budget-ppb-proposed",
  approved: "budget-ppb-approved",
  expenditure: "budget-ppb-expenditure",
};

const formatYAxis = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value}`;
};

function regularBudgetAmount(data: BudgetData): number {
  const root =
    data.nodes.find((node) => node.parentId === null) ?? data.nodes[0];
  return root?.values?.regular_budget ?? 0;
}

export function ProgrammeBudgetTrends() {
  const [points, setPoints] = useState<Array<
    Record<string, number | string | null>
  > | null>(null);

  useEffect(() => {
    let active = true;
    const jobs = METRICS.flatMap((metric) =>
      metric.years.map(async (year) => {
        const data = await loadYearData<BudgetData>(DATASETS[metric.key], year);
        return { metric: metric.key, year, amount: regularBudgetAmount(data) };
      }),
    );
    Promise.all(jobs)
      .then((rows) => {
        if (!active) return;
        const byYear = new Map<
          number,
          Record<string, number | string | null>
        >();
        for (const year of new Set(rows.map((row) => row.year))) {
          byYear.set(year, {
            year: String(year),
            proposed: null,
            approved: null,
            expenditure: null,
          });
        }
        for (const row of rows) {
          const point = byYear.get(row.year);
          if (point) point[row.metric] = row.amount;
        }
        setPoints(
          [...byYear.entries()]
            .sort(([a], [b]) => a - b)
            .map(([, point]) => point),
        );
      })
      .catch((error: unknown) => {
        console.error("Failed to load programme-budget trends:", error);
        if (active) setPoints([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasData = useMemo(
    () =>
      (points ?? []).some((point) =>
        METRICS.some((metric) => point[metric.key] !== null),
      ),
    [points],
  );

  if (points === null) {
    return (
      <div className="mt-10 h-[280px] text-sm text-gray-500">
        Loading trends…
      </div>
    );
  }
  if (!hasData) return null;

  return (
    <div className="mt-10 w-full lg:w-1/2 lg:pe-3">
      <h3 className="mb-3 text-lg font-medium text-gray-900">
        Regular budget over time
      </h3>
      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-gray-500">
        Proposed, approved and expenditure figures cover different years because
        they are published in different programme-budget editions.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {METRICS.map((metric) => (
          <div
            key={metric.key}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: metric.color }}
            />
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              orientation="right"
              width={1}
              tick={{ fontSize: 11, fill: "#6b7280", dx: -5, dy: -8 }}
              tickLine={false}
              axisLine={false}
              domain={[0, "auto"]}
              tickFormatter={formatYAxis}
              mirror
            />
            <Tooltip
              formatter={(value, name) =>
                typeof value === "number"
                  ? [formatBudget(value), String(name)]
                  : ["—", String(name)]
              }
              labelFormatter={(label) => `Year: ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            />
            {METRICS.map((metric) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
