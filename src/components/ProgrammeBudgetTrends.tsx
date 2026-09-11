"use client";
import { HierarchicalSingleSelect } from "@un-eosg/ui/components/hierarchical-single-select";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";

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
import { PART_BAND_COLORS } from "@/lib/secretariatGroupings";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import type { BudgetData, BudgetMetricKey, BudgetNode } from "@/types";

const METRICS: Array<{
  key: BudgetMetricKey;
  label: string;
  color: string;
  years: number[];
}> = [
  {
    key: "proposed",
    label: "Proposed",
    color: "var(--color-un-orange)",
    years: [2021, 2022, 2023, 2024, 2025, 2026, 2027],
  },
  {
    key: "approved",
    label: "Approved",
    color: "var(--color-un-red)",
    years: [2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    key: "expenditure",
    label: "Expenditure",
    color: "var(--color-un-purple)",
    years: [2021, 2022, 2023, 2024, 2025],
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

export function ProgrammeBudgetTrends() {
  const [hiddenMetrics, setHiddenMetrics] = useState<BudgetMetricKey[]>([]);
  const [selectedNode, setSelectedNode] = useState("whole");
  const [datasets, setDatasets] = useState<Array<{
    metric: BudgetMetricKey;
    year: number;
    data: BudgetData;
  }> | null>(null);

  useEffect(() => {
    let active = true;
    const jobs = METRICS.flatMap((metric) =>
      metric.years.map(async (year) => {
        const data = await loadYearData<BudgetData>(DATASETS[metric.key], year);
        return { metric: metric.key, year, data };
      }),
    );
    Promise.all(jobs)
      .then((rows) => {
        if (!active) return;
        setDatasets(rows);
      })
      .catch((error: unknown) => {
        console.error("Failed to load programme-budget trends:", error);
        if (active) setDatasets([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => {
    const byId = new Map<string, BudgetNode>();
    for (const row of [...(datasets ?? [])].sort((a, b) => a.year - b.year)) {
      for (const node of row.data.nodes) {
        if (node.tier === "part") byId.set(node.id, node);
      }
    }
    const numerals = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
      "XIII",
      "XIV",
    ];
    return [
      { id: "whole", label: "Whole regular budget", children: [] },
      ...[...byId.values()]
        .sort(
          (a, b) =>
            numerals.indexOf(a.code ?? "") - numerals.indexOf(b.code ?? ""),
        )
        .map((node) => ({
          id: node.id,
          label: `Part ${node.code}: ${node.label}`,
          children: [],
          color: PART_BAND_COLORS[node.code ?? ""]?.bg,
        })),
    ];
  }, [datasets]);

  const points = useMemo(() => {
    if (!datasets) return null;
    const byYear = new Map<number, Record<string, number | string | null>>();
    for (const row of datasets) {
      if (!byYear.has(row.year))
        byYear.set(row.year, {
          year: String(row.year),
          proposed: null,
          approved: null,
          expenditure: null,
        });
      const node = row.data.nodes.find((item) => item.id === selectedNode);
      byYear.get(row.year)![row.metric] = node?.values?.regular_budget ?? null;
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, point]) => point);
  }, [datasets, selectedNode]);

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
  if (datasets?.length === 0) return null;

  return (
    <div className="mt-10 w-full lg:w-1/2 lg:pe-3">
      <h3 className="mb-3 text-lg font-medium text-gray-900">
        Regular budget over time
      </h3>
      <div
        className="mb-3 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Budget trends"
      >
        <HierarchicalSingleSelect
          groups={groups}
          selected={selectedNode}
          onChange={setSelectedNode}
        />
        {METRICS.map((metric) => (
          <LegendLabel
            key={metric.key}
            label={metric.label}
            color={metric.color}
            selected={!hiddenMetrics.includes(metric.key)}
            onToggle={() =>
              setHiddenMetrics((current) =>
                current.includes(metric.key)
                  ? current.filter((key) => key !== metric.key)
                  : [...current, metric.key],
              )
            }
          />
        ))}
      </div>
      <div className="h-[280px] w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No regular-budget data is available for this item.
          </div>
        ) : hiddenMetrics.length === METRICS.length ? (
          <div
            className="flex h-full items-center justify-center text-sm text-gray-500"
            role="status"
          >
            Select a measure to show the trend.
          </div>
        ) : (
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
              {METRICS.filter(
                (metric) => !hiddenMetrics.includes(metric.key),
              ).map((metric) => (
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
        )}
      </div>
    </div>
  );
}
