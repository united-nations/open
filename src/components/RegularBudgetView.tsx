"use client";

import { useState } from "react";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
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
  const [grouping, setGrouping] = useState<PpbGrouping>("section");
  const showContextNote =
    metric === "expenditure" &&
    active.some((source) => source !== "regular_budget");

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
        <SegmentedControl
          label="Budget metric"
          value={metric}
          onValueChange={(value) => {
            const nextMetric = METRICS.find((item) => item.key === value)?.key;
            if (nextMetric && METRIC_YEARS[nextMetric].includes(year))
              selectMetric(nextMetric);
          }}
          options={METRICS.map((item) => {
            const unavailable = !METRIC_YEARS[item.key].includes(year);
            return {
              value: item.key,
              label: item.label,
              disabled: unavailable,
              description: unavailable
                ? `${item.label} data is not available for ${year} in the current dataset. ${item.description}`
                : item.description,
            };
          })}
        />
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
          onToggle={(source) =>
            setActive((current) => toggleFundingSource(current, source))
          }
        />
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none ${
          showContextNote
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!showContextNote}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="mb-4 text-sm text-gray-700">
            Other assessed and extrabudgetary resources are not part of the
            programme budget itself. They are shown here for context.
          </p>
        </div>
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
