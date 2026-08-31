"use client";

import { useState } from "react";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import {
  FundingSourcePills,
  toggleFundingSource,
} from "@/components/FundingSourcePills";
import { ProgrammeBudgetTrends } from "@/components/ProgrammeBudgetTrends";
import { YearSlider } from "@/components/YearSlider";
import {
  BUDGET_FUNDING_SOURCES,
  type BudgetFundingSource,
  type PpbGrouping,
} from "@/lib/budgetGroupings";
import type { BudgetMetricKey } from "@/types";

const METRICS: Array<{
  key: BudgetMetricKey;
  label: string;
  description: string;
}> = [
  {
    key: "proposed",
    label: "Proposed",
    description: "Regular-budget proposal for the selected budget year.",
  },
  {
    key: "approved",
    label: "Approved",
    description:
      "Approved or appropriated regular budget, reported in the following PPB edition.",
  },
  {
    key: "expenditure",
    label: "Expenditure",
    description:
      "Actual expenditure reported two PPB editions after the selected budget year.",
  },
];

const METRIC_YEARS: Record<BudgetMetricKey, number[]> = {
  proposed: [2021, 2022, 2023, 2024, 2025, 2026, 2027],
  approved: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  expenditure: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
};

const ALL_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027];

const DATASETS: Record<
  BudgetMetricKey,
  "budget-ppb-proposed" | "budget-ppb-approved" | "budget-ppb-expenditure"
> = {
  proposed: "budget-ppb-proposed",
  approved: "budget-ppb-approved",
  expenditure: "budget-ppb-expenditure",
};

const SOURCE_EDITION_OFFSET: Record<BudgetMetricKey, number> = {
  proposed: 0,
  approved: 1,
  expenditure: 2,
};

export function RegularBudgetView() {
  const [active, setActive] = useState<BudgetFundingSource[]>([
    "regular_budget",
  ]);
  const [metric, setMetric] = useState<BudgetMetricKey>("expenditure");
  const [year, setYear] = useState(2025);
  const [grouping, setGrouping] = useState<PpbGrouping>("entity");
  const availableMetrics = METRICS.filter((item) =>
    METRIC_YEARS[item.key].includes(year),
  );

  const selectYear = (nextYear: number) => {
    setYear(nextYear);
    const nextMetric = METRIC_YEARS[metric].includes(nextYear)
      ? metric
      : METRIC_YEARS.expenditure.includes(nextYear)
        ? "expenditure"
        : METRIC_YEARS.approved.includes(nextYear)
          ? "approved"
          : "proposed";
    setMetric(nextMetric);
    if (nextMetric !== "expenditure") setActive(["regular_budget"]);
  };

  const selectMetric = (nextMetric: BudgetMetricKey) => {
    setMetric(nextMetric);
    if (nextMetric !== "expenditure") setActive(["regular_budget"]);
  };

  return (
    <div>
      <div className="mb-5 max-w-xl">
        <p className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
          Budget year
        </p>
        <YearSlider
          years={ALL_YEARS}
          selectedYear={year}
          onChange={selectYear}
        />
      </div>

      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Budget category"
      >
        {availableMetrics.map((item) => {
          const selected = metric === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={selected}
              title={item.description}
              onClick={() => selectMetric(item.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none ${
                selected
                  ? "bg-un-blue font-medium text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              <span>{item.label}</span>
              <span className={selected ? "text-blue-100" : "text-gray-400"}>
                PPB {year + SOURCE_EDITION_OFFSET[item.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <FundingSourcePills
          selected={active}
          sources={
            metric === "expenditure"
              ? BUDGET_FUNDING_SOURCES
              : (["regular_budget"] as BudgetFundingSource[])
          }
          disabled={metric !== "expenditure"}
          onToggle={(source) =>
            setActive((current) => toggleFundingSource(current, source))
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
          Group by
        </span>
        {(
          [
            {
              key: "entity",
              label: "Entities",
              title:
                "Canonical organizations aggregated within each budget part; unassignable amounts remain explicit.",
            },
            {
              key: "section",
              label: "Budget sections",
              title: "One tile per numbered programme-budget section.",
            },
          ] as Array<{ key: PpbGrouping; label: string; title: string }>
        ).map((option) => {
          const selected = grouping === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              title={option.title}
              onClick={() => setGrouping(option.key)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none ${
                selected
                  ? "bg-gray-800 font-medium text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <BudgetTreemap
        dataset={DATASETS[metric]}
        hashPrefix="regular-budget"
        sectionId="regular-budget-spending"
        activeFundingSources={active}
        metric={metric}
        selectedYear={year}
        availableYears={METRIC_YEARS[metric]}
        showYearSelector={false}
        headlineFundingSource="regular_budget"
        ppbGrouping={grouping}
      />
      <ProgrammeBudgetTrends />
    </div>
  );
}
