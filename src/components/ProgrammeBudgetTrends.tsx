"use client";
import { ChartHeading } from "@/components/ContentHeading";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { SourceAwareTrendTooltip } from "./charts/SourceAwareTrendTooltip";
import type { ProgrammeBudgetTrendRow } from "@/lib/staticTrendData";
import { FinancialChartTooltip } from "./charts/FinancialChartTooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { HierarchicalSingleSelect } from "@un-eosg/ui/components/hierarchical-single-select";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";

import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { PART_BAND_COLORS } from "@/lib/secretariatGroupings";
import { budgetTrendSources } from "@/lib/budgetTrendSources";
import { loadYearData } from "@/lib/data";
import type { BudgetData, BudgetMetricKey, BudgetNodeSource } from "@/types";

const METRICS: Array<{
  key: BudgetMetricKey;
  label: string;
  color: string;
}> = [
  {
    key: "proposed",
    label: "Proposed",
    color: "var(--color-un-green)",
  },
  {
    key: "approved",
    label: "Approved",
    color: "var(--color-un-orange)",
  },
  {
    key: "expenditure",
    label: "Expenditure",
    color: "var(--color-un-purple)",
  },
];

const formatYAxis = sharedFormatBudget;

function ProgrammeBudgetTrendTooltip({
  year,
  nodeId,
  metrics,
  tooltip,
}: {
  year: number;
  nodeId: string;
  metrics: readonly BudgetMetricKey[];
  tooltip: ComponentProps<typeof FinancialChartTooltip>;
}) {
  const [sources, setSources] = useState<BudgetNodeSource[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.allSettled(
      metrics.map(async (metric) => {
        const { nodes } = await loadYearData<BudgetData>(
          `budget-ppb-${metric}`,
          year,
        );
        const node = nodes.find((item) => item.id === nodeId);
        return node
          ? budgetTrendSources(nodes, node, metric, ["regular_budget"])
          : [];
      }),
    ).then((results) => {
      if (active) {
        setSources(
          results.flatMap((result) =>
            result.status === "fulfilled" ? result.value : [],
          ),
        );
      }
    });
    return () => {
      active = false;
    };
  }, [metrics, nodeId, year]);

  return <FinancialChartTooltip {...tooltip} sources={sources} />;
}

export function ProgrammeBudgetTrends({
  datasets,
}: {
  datasets: ProgrammeBudgetTrendRow[];
}) {
  const [hiddenMetrics, setHiddenMetrics] = useState<BudgetMetricKey[]>([]);
  const [selectedNode, setSelectedNode] = useState("whole");
  const groups = useMemo(() => {
    const byId = new Map<string, ProgrammeBudgetTrendRow["items"][string]>();
    for (const row of [...datasets].sort((a, b) => a.year - b.year)) {
      for (const [id, node] of Object.entries(row.items)) {
        if (id !== "whole") byId.set(id, node);
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
      { id: "whole", label: "Whole programme budget", children: [] },
      ...[...byId.entries()]
        .sort(
          ([, a], [, b]) =>
            numerals.indexOf(a.code ?? "") - numerals.indexOf(b.code ?? ""),
        )
        .map(([id, node]) => ({
          id,
          label: `Part ${node.code}: ${node.label}`,
          children: [],
          color: PART_BAND_COLORS[node.code ?? ""]?.bg,
        })),
    ];
  }, [datasets]);

  const points = useMemo(() => {
    const byYear = new Map<number, Record<string, number | string | null>>();
    for (const row of datasets) {
      if (!byYear.has(row.year))
        byYear.set(row.year, {
          year: String(row.year),
          proposed: null,
          approved: null,
          expenditure: null,
        });
      byYear.get(row.year)![row.metric] =
        row.items[selectedNode]?.amount ?? null;
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, point]) => point);
  }, [datasets, selectedNode]);

  const hasData = useMemo(
    () =>
      points.some((point) =>
        METRICS.some((metric) => point[metric.key] !== null),
      ),
    [points],
  );
  const metricsByYear = useMemo(() => {
    const byYear = new Map<number, BudgetMetricKey[]>();
    for (const { year, metric, items } of datasets) {
      if (hiddenMetrics.includes(metric) || items[selectedNode]?.amount == null)
        continue;
      const metrics = byYear.get(year) ?? [];
      metrics.push(metric);
      byYear.set(year, metrics);
    }
    return byYear;
  }, [datasets, hiddenMetrics, selectedNode]);

  return (
    <div className="mt-10 w-full lg:w-1/2 lg:pe-3" data-money-chart>
      <ChartHeading className="mb-3">Programme budget over time</ChartHeading>
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

      <div className="w-full" style={{ height: TREND_CHART_HEIGHT }}>
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
            <LineChart data={points} margin={TREND_CHART_MARGIN}>
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
              <SourceAwareTrendTooltip
                key={`${selectedNode}-${hiddenMetrics.join("|")}`}
                interactive
                constrainToViewport
                content={(props) => {
                  const year = Number(props.label);
                  const metrics = metricsByYear.get(year);
                  return props.active && metrics ? (
                    <ProgrammeBudgetTrendTooltip
                      key={year}
                      year={year}
                      nodeId={selectedNode}
                      metrics={metrics}
                      tooltip={props}
                    />
                  ) : (
                    <FinancialChartTooltip {...props} />
                  );
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
