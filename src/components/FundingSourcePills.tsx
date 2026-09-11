"use client";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";

import {
  BUDGET_FUNDING_SOURCES,
  type BudgetFundingSource,
} from "@/lib/budgetGroupings";

export function toggleFundingSource(
  current: BudgetFundingSource[],
  source: BudgetFundingSource,
): BudgetFundingSource[] {
  if (current.includes(source)) {
    return current.length === 1
      ? current
      : current.filter((item) => item !== source);
  }
  return BUDGET_FUNDING_SOURCES.filter(
    (item) => item === source || current.includes(item),
  );
}

export function FundingSourcePills({
  selected,
  onToggle,
  sources = BUDGET_FUNDING_SOURCES,
  disabled = false,
  grouped = false,
  explanations,
}: {
  selected: readonly BudgetFundingSource[];
  onToggle: (source: BudgetFundingSource) => void;
  sources?: readonly BudgetFundingSource[];
  disabled?: boolean;
  grouped?: boolean;
  explanations?: Partial<Record<BudgetFundingSource, string>>;
}) {
  return (
    <div
      className={
        grouped
          ? "flex flex-wrap gap-1 rounded-md border border-gray-200 bg-white p-1"
          : "flex flex-wrap gap-2"
      }
      role="group"
      aria-label="Funding sources"
    >
      {sources.map((source) => {
        const active = selected.includes(source);
        return (
          <FundingSourceLabel
            source={source}
            key={source}
            selected={active}
            explanation={explanations?.[source]}
            disabled={disabled}
            onToggle={() => onToggle(source)}
          />
        );
      })}
    </div>
  );
}
