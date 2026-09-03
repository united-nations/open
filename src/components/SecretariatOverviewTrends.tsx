"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import { loadYearData } from "@/lib/data";
import { FUNDING_SOURCE_TREND_SERIES } from "@/components/SidebarStackedTrend";
import { priorityAreaColor } from "@/lib/secretariatGroupings";
import { useYearRanges } from "@/lib/useYearRanges";
import type { BudgetFundingSource, SecretariatOverviewData } from "@/types";

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
      const point: FinancingInstrumentDataPoint = {
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

  const prioritySeries = useMemo<FinancingSeries[]>(
    () =>
      priorities.map((name) => ({
        key: name,
        label: name,
        color: priorityAreaColor(name),
      })),
    [priorities],
  );

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
      <h3 className="mb-4 text-lg font-medium text-gray-900">Explore trends</h3>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Spending by priority area
          </h4>
          <FinancingInstrumentChart
            data={priorityData}
            series={prioritySeries}
          />
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
