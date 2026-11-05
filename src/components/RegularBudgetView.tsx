"use client";
import manifest from "../../public/data/manifest.json";

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
  proposed: manifest.budgetPpbProposed.years,
  approved: manifest.budgetPpbApproved.years,
  expenditure: manifest.budgetPpb.years,
};

const DATASETS: Record<
  BudgetMetricKey,
  "budget-ppb-proposed" | "budget-ppb-approved" | "budget-ppb-expenditure"
> = {
  proposed: "budget-ppb-proposed",
  approved: "budget-ppb-approved",
  expenditure: "budget-ppb-expenditure",
};

const fundingSourcesForYear = (year: number) =>
  BUDGET_FUNDING_SOURCES.filter(
    (source) =>
      (manifest.budgetPpb.fundingSourcesByYear as Record<string, string[]>)[
        String(year)
      ]?.includes(source) ?? true,
  );

export function RegularBudgetView() {
  const [active, setActive] = useState<BudgetFundingSource[]>([
    "regular_budget",
  ]);
  const [metric, setMetric] = useState<BudgetMetricKey>("expenditure");
  const [year, setYear] = useState(manifest.budgetPpb.default);
  const [grouping, setGrouping] = useState<PpbGrouping>("section");

  const selectYear = (nextYear: number) => {
    setYear(nextYear);
    const nextMetric = metric;
    if (nextMetric !== "expenditure") setActive(["regular_budget"]);
    else
      setActive((current) => {
        const available = current.filter((source) =>
          fundingSourcesForYear(nextYear).includes(source),
        );
        return available.length ? available : ["regular_budget"];
      });
  };

  const selectMetric = (nextMetric: BudgetMetricKey) => {
    setMetric(nextMetric);
    const availableYears = METRIC_YEARS[nextMetric];
    if (!availableYears.includes(year)) {
      setYear(
        availableYears.reduce((closest, candidate) =>
          Math.abs(candidate - year) < Math.abs(closest - year)
            ? candidate
            : closest,
        ),
      );
    }
    if (nextMetric !== "expenditure") setActive(["regular_budget"]);
    else
      setActive((current) => {
        const available = current.filter((source) =>
          fundingSourcesForYear(year).includes(source),
        );
        return available.length ? available : ["regular_budget"];
      });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Budget metric"
          value={metric}
          onValueChange={(value) => {
            const nextMetric = METRICS.find((item) => item.key === value)?.key;
            if (nextMetric) selectMetric(nextMetric);
          }}
          options={METRICS.map((item) => ({
            value: item.key,
            label: item.label,
            description: item.description,
          }))}
        />
        <FundingSourcePills
          neutral
          selected={active}
          sources={
            metric === "expenditure"
              ? fundingSourcesForYear(year)
              : BUDGET_FUNDING_SOURCES
          }
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

      <BudgetTreemap
        yearControl={
          <YearSlider
            years={METRIC_YEARS[metric]}
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
