import type { BudgetNode } from "@/types";
import { BUDGET_FUNDING_SOURCES } from "@/lib/budgetGroupings";

/** Retain printed zeros and signed adjustments; an absent field is unavailable. */
export function budgetFundingEntries(node: BudgetNode) {
  return BUDGET_FUNDING_SOURCES.flatMap((source) => {
    const amount = node.values?.[source];
    return typeof amount === "number" ? ([[source, amount]] as const) : [];
  });
}

export function budgetFundingPoint(year: number, node?: BudgetNode) {
  return {
    year: String(year),
    regular_budget: node?.values?.regular_budget ?? null,
    other_assessed: node?.values?.other_assessed ?? null,
    extrabudgetary: node?.values?.extrabudgetary ?? null,
  };
}
