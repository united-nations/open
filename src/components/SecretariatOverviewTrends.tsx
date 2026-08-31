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
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { FUNDING_SOURCE_TREND_SERIES } from "@/components/SidebarStackedTrend";
import { priorityAreaColor } from "@/lib/secretariatGroupings";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  BudgetFundingSource,
  SecretariatOverviewData,
} from "@/types";

const formatYAxis = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value}`;
};

export function SecretariatOverviewTrends() {
  const years = useYearRanges().secretariatOverview.years;
  const [series, setSeries] = useState<SecretariatOverviewData[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((year) =>
        loadYearData<SecretariatOverviewData>("secretariat-overview", year),
      ),
    )
      .then((rows) => {
        if (active) setSeries(rows);
      })
      .catch((error: unknown) => {
        console.error("Failed to load Secretariat overview trends:", error);
        if (active) setSeries([]);
      });
    return () => {
      active = false;
    };
  }, [years]);

  const priorities = useMemo(() => {
    const names = new Set<string>();
    for (const row of series ?? []) {
      for (const name of row.meta.priorities) names.add(name);
    }
    return [...names].sort(
      (a, b) =>
        priorityTotals(series ?? [], b) - priorityTotals(series ?? [], a),
    );
  }, [series]);

  const priorityData = useMemo(() => {
    if (!series) return [];
    return series.map((row) => {
      const point: Record<string, number | string> = {
        year: String(row.meta.year),
      };
      const amounts = new Map<string, number>();
      for (const entity of row.entities) {
        for (const cell of entity.cells) {
          amounts.set(
            cell.priority_area,
            (amounts.get(cell.priority_area) ?? 0) + cell.amount,
          );
        }
      }
      for (const name of priorities) {
        point[name] = amounts.get(name) ?? 0;
      }
      return point;
    });
  }, [priorities, series]);

  const fundingData = useMemo(() => {
    if (!series) return [];
    return series.map((row) => {
      const amounts: Record<BudgetFundingSource, number> = {
        regular_budget: 0,
        other_assessed: 0,
        extrabudgetary: 0,
      };
      for (const entity of row.entities) {
        for (const cell of entity.cells) {
          amounts[cell.funding_source] += cell.amount;
        }
      }
      return {
        year: String(row.meta.year),
        regular_budget: amounts.regular_budget,
        other_assessed: amounts.other_assessed,
        extrabudgetary: amounts.extrabudgetary,
      };
    });
  }, [series]);

  if (series === null) {
    return (
      <div className="mt-10 h-[280px] text-sm text-gray-500">
        Loading trends…
      </div>
    );
  }
  if (series.length === 0) {
    return null;
  }

  return (
    <div className="mt-10">
      <h3 className="mb-4 text-lg font-medium text-gray-900">
        Explore trends
      </h3>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Spending by priority area
          </h4>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={priorityData}
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
                  shared={false}
                  formatter={(value, name) => [
                    typeof value === "number" ? formatBudget(value) : "N/A",
                    String(name),
                  ]}
                  labelFormatter={(label) => `Year: ${label}`}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                {priorities.map((name) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={priorityAreaColor(name)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Spending by funding source
          </h4>
          <FinancingInstrumentChart
            data={fundingData}
            series={FUNDING_SOURCE_TREND_SERIES}
          />
        </div>
      </div>
    </div>
  );
}

function priorityTotals(rows: SecretariatOverviewData[], name: string) {
  return rows.reduce((sum, row) => {
    return (
      sum +
      row.entities.reduce(
        (entitySum, entity) =>
          entitySum +
          entity.cells.reduce(
            (cellSum, cell) =>
              cell.priority_area === name ? cellSum + cell.amount : cellSum,
            0,
          ),
        0,
      )
    );
  }, 0);
}
