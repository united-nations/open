"use client";

import { useState } from "react";
import { ChartHeading } from "@/components/ContentHeading";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { HierarchicalSingleSelect } from "@/components/ui/hierarchical-single-select";
import {
  POOLED_FUND_METRICS,
  pooledFundColor,
  sumPooledAmounts,
} from "@/lib/pooledFunds";
import type { PooledFundsIndex, PooledFundMetric } from "@/types";

export function PooledFundsTrendsChart({
  data,
  metric,
}: {
  data: PooledFundsIndex;
  metric: PooledFundMetric;
}) {
  const [fundId, setFundId] = useState("all");
  const definition = POOLED_FUND_METRICS[metric];
  const categories = [
    ...new Set(
      data.annual.flatMap((annual) =>
        Object.values(annual.funds).map(
          (fund) => fund.category ?? "Not specified",
        ),
      ),
    ),
  ].sort();
  // Searchable child labels include the source code to distinguish duplicate names.
  const fundLabels = new Map(
    Object.values(data.funds).map((fund) => [
      fund.id,
      `${fund.name} (${fund.id})`,
    ]),
  );
  const fundIds = new Map([...fundLabels].map(([id, label]) => [label, id]));
  const selectorCategories = [
    ...new Set(Object.values(data.funds).map((fund) => fund.category)),
  ].sort();
  const groups = [
    { id: "all", label: "All funds", children: [], color: "#009edb" },
    ...selectorCategories.map((category) => ({
      id: `category:${category}`,
      label: category,
      color: pooledFundColor(category),
      children: Object.values(data.funds)
        .filter((fund) => fund.category === category)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((fund) => fundLabels.get(fund.id)!),
    })),
  ];
  const selectedLabel =
    fundId === "all"
      ? "All funds"
      : fundId.startsWith("category:")
        ? fundId.slice("category:".length)
        : data.funds[fundId].name;
  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-2">
      <section className="min-w-0 space-y-3">
        <ChartHeading>
          {definition.shortLabel} by category over time
        </ChartHeading>
        <FinancingInstrumentChart
          data={data.annual.map((annual) => ({
            year: String(annual.year),
            ...Object.fromEntries(
              categories.map((category) => {
                const values = Object.values(annual.funds)
                  .filter(
                    (fund) => (fund.category ?? "Not specified") === category,
                  )
                  .map((fund) => fund[metric]);
                return [category, sumPooledAmounts(values)];
              }),
            ),
          }))}
          series={categories.map((category) => ({
            key: category,
            label: category,
            color: pooledFundColor(category),
          }))}
          allowNegative
          filterable
          showShareToggle
          height={260}
          accessibleTableLabel={`${definition.label} by fund category`}
        />
      </section>
      <section className="min-w-0 space-y-3">
        <ChartHeading>
          {definition.shortLabel} for a fund over time
        </ChartHeading>
        <div role="group" aria-label="Fund for trends">
          <HierarchicalSingleSelect
            groups={groups}
            selected={fundLabels.get(fundId) ?? fundId}
            onChange={(selected) =>
              setFundId(fundIds.get(selected) ?? selected)
            }
            getLabel={() => selectedLabel}
          />
        </div>
        <FinancingInstrumentChart
          data={data.annual.map((annual) => ({
            year: String(annual.year),
            amount:
              fundId === "all"
                ? annual.totals[metric]
                : fundId.startsWith("category:")
                  ? sumPooledAmounts(
                      Object.values(annual.funds)
                        .filter(
                          (fund) =>
                            (fund.category ?? "Not specified") ===
                            fundId.slice("category:".length),
                        )
                        .map((fund) => fund[metric]),
                    )
                  : (annual.funds[fundId]?.[metric] ?? null),
          }))}
          series={[
            {
              key: "amount",
              label: definition.shortLabel,
              color: definition.color,
            },
          ]}
          allowNegative
          showLegend={false}
          height={224}
          accessibleTableLabel={`${definition.label} for ${selectedLabel}`}
        />
      </section>
    </div>
  );
}
