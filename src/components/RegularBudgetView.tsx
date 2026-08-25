"use client";

import { useState } from "react";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SOURCES,
  type BudgetFundingSource,
} from "@/lib/budgetGroupings";

export function RegularBudgetView() {
  const [active, setActive] = useState<BudgetFundingSource[]>([
    "regular_budget",
  ]);
  const informational = active.some((source) => source !== "regular_budget");

  const toggle = (source: BudgetFundingSource) => {
    setActive((current) => {
      if (current.includes(source)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== source);
      }
      return BUDGET_FUNDING_SOURCES.filter(
        (item) => item === source || current.includes(item),
      );
    });
  };

  return (
    <div>
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Funding sources"
      >
        {BUDGET_FUNDING_SOURCES.map((source) => {
          const selected = active.includes(source);
          return (
            <button
              key={source}
              type="button"
              aria-pressed={selected}
              title={FUNDING_SOURCES[source].tooltip}
              onClick={() => toggle(source)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none ${
                selected
                  ? "bg-gray-100 font-medium text-gray-800"
                  : "bg-white text-gray-400 ring-1 ring-gray-200"
              }`}
            >
              <span
                className={`size-2.5 rounded-full ${FUNDING_SOURCES[source].color} ${selected ? "opacity-100" : "opacity-35"}`}
              />
              {FUNDING_SOURCES[source].label}
            </button>
          );
        })}
      </div>

      {informational && (
        <p className="mb-4 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Other assessed and extrabudgetary expenditure are not part of the
          regular budget itself and are displayed for informational purposes.
        </p>
      )}

      <BudgetTreemap
        dataset="budget-ppb"
        hashPrefix="regular-budget"
        sectionId="regular-budget-spending"
        activeFundingSources={active}
        headlineFundingSource="regular_budget"
      />
    </div>
  );
}
