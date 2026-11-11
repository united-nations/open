"use client";
import { ChartHeading } from "@/components/ContentHeading";

import { useMemo, useState } from "react";
import { HierarchicalMultiSelect } from "@/components/ui/hierarchical-multi-select";
import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import { FUNDING_SOURCE_TREND_SERIES } from "@/components/SidebarStackedTrend";
import { priorityAreaColor } from "@/lib/secretariatGroupings";
import type { SecretariatTrendRow } from "@/lib/staticTrendData";

export function SecretariatOverviewTrends({
  series,
}: {
  series: SecretariatTrendRow[];
}) {
  const [hiddenPriorities, setHiddenPriorities] = useState<string[]>([]);
  const priorities = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of series) {
      for (const [name, amount] of Object.entries(row.priorities)) {
        totals.set(name, (totals.get(name) ?? 0) + amount);
      }
    }
    return [...totals].sort(([, a], [, b]) => b - a).map(([name]) => name);
  }, [series]);

  const priorityData = useMemo<FinancingInstrumentDataPoint[]>(
    () =>
      series.map((row) => ({
        ...Object.fromEntries(
          priorities.map((name) => [name, row.priorities[name] ?? 0]),
        ),
        year: String(row.year),
      })),
    [priorities, series],
  );

  const prioritySeries = useMemo<FinancingSeries[]>(
    () =>
      priorities.map((name) => ({
        key: name,
        label: name,
        color: priorityAreaColor(name),
      })),
    [priorities],
  );

  const fundingData = useMemo(
    () => series.map((row) => ({ year: String(row.year), ...row.funding })),
    [series],
  );

  return (
    <div className="mt-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col">
          <ChartHeading className="mb-3">
            Expenditure by priority area
          </ChartHeading>
          <HierarchicalMultiSelect
            className="mb-3"
            selectionSummary={
              priorities.every((name) => !hiddenPriorities.includes(name))
                ? "All priority areas"
                : `${priorities.filter((name) => !hiddenPriorities.includes(name)).length} priority areas selected`
            }
            groups={prioritySeries.map((item) => ({
              id: item.key,
              label: item.label,
              bgColor: item.color,
              children: [],
            }))}
            selected={
              new Set(
                priorities.filter((name) => !hiddenPriorities.includes(name)),
              )
            }
            onChange={(selected) =>
              setHiddenPriorities(
                priorities.filter((name) => !selected.has(name)),
              )
            }
            getItemColor={priorityAreaColor}
          />
          <FinancingInstrumentChart
            data={priorityData}
            series={prioritySeries}
            hiddenSeriesKeys={hiddenPriorities}
            emptySelectionMessage="Select a priority area to show the trend."
            accessibleTableLabel="Expenditure by priority area"
            showLegend={false}
            showShareToggle
          />
        </div>
        <div className="flex flex-col">
          <ChartHeading className="mb-3">
            Expenditure by funding source
          </ChartHeading>
          <FinancingInstrumentChart
            data={fundingData}
            filterable
            accessibleTableLabel="Expenditure by funding source"
            showShareToggle
            series={FUNDING_SOURCE_TREND_SERIES.map((item) =>
              item.key === "other_assessed"
                ? { ...item, color: "var(--color-faded-jade)" }
                : item,
            )}
          />
        </div>
      </div>
    </div>
  );
}
