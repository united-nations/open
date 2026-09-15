"use client";

import { useState } from "react";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
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

export function RegularBudgetView() {
  const [active, setActive] = useState<BudgetFundingSource[]>([
    "regular_budget",
  ]);
  const [metric, setMetric] = useState<BudgetMetricKey>("expenditure");
  const [year, setYear] = useState(2025);
  const [grouping, setGrouping] = useState<PpbGrouping>("entity");

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          className="flex flex-wrap gap-1 rounded-md border border-gray-200 bg-white p-1"
          role="group"
          aria-label="Budget metric"
        >
          {METRICS.map((item) => {
            const selected = metric === item.key;
            const unavailable = !METRIC_YEARS[item.key].includes(year);
            const explanation = unavailable
              ? `${item.label} data is not available for ${year} in the current dataset. ${item.description}`
              : item.description;
            return (
              <Tooltip key={item.key} content={explanation}>
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-disabled={unavailable}
                  onClick={() => {
                    if (!unavailable) selectMetric(item.key);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none ${
                    unavailable
                      ? "cursor-not-allowed text-gray-400 opacity-60"
                      : selected
                        ? "bg-un-blue font-medium text-white"
                        : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              </Tooltip>
            );
          })}
        </div>
        <FundingSourcePills
          neutral
          selected={active}
          sources={BUDGET_FUNDING_SOURCES}
          disabled={metric !== "expenditure"}
          explanations={
            metric !== "expenditure"
              ? {
                  regular_budget: "This view covers the regular budget.",
                  other_assessed:
                    "This funding source is available only in the expenditure view of this chart.",
                  extrabudgetary:
                    "This funding source is available only in the expenditure view of this chart.",
                }
              : undefined
          }
          grouped
          onToggle={(source) =>
            setActive((current) => toggleFundingSource(current, source))
          }
        />
      </div>

      <BudgetTreemap
        yearControl={
          <YearSlider
            years={ALL_YEARS}
            selectedYear={year}
            onChange={selectYear}
          />
        }
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
        onPpbGroupingChange={setGrouping}
      />
      <ProgrammeBudgetTrends />
    </div>
  );
}
