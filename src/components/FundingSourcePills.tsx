"use client";

import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SOURCES,
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
}: {
  selected: readonly BudgetFundingSource[];
  onToggle: (source: BudgetFundingSource) => void;
  sources?: readonly BudgetFundingSource[];
  disabled?: boolean;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Funding sources"
    >
      {sources.map((source) => {
        const active = selected.includes(source);
        return (
          <button
            key={source}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            title={FUNDING_SOURCES[source].tooltip}
            onClick={() => onToggle(source)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none ${
              active
                ? "bg-gray-100 font-medium text-gray-800"
                : "bg-white text-gray-400 ring-1 ring-gray-200"
            }`}
          >
            <span
              className={`size-2.5 rounded-full ${FUNDING_SOURCES[source].color} ${active ? "opacity-100" : "opacity-35"}`}
            />
            {FUNDING_SOURCES[source].label}
          </button>
        );
      })}
    </div>
  );
}
