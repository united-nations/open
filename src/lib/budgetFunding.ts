import { formatCurrency } from "@un-eosg/ui/format-budget";
import type {
  BudgetNode,
  BudgetFundingSource,
  BudgetChfConversion,
} from "@/types";
import { formatBudget } from "@/lib/entities";
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

export function formatChf(amount: number): string {
  return formatCurrency(amount, "CHF");
}

export function formatCurrencyParts(usd: number, chf: number): string {
  if (Math.abs(usd) < 0.005) return formatChf(chf);
  if (chf === 0) return formatBudget(usd);
  return `${formatBudget(usd)} + ${formatChf(chf)}`;
}

export function formatBudgetNode(node: BudgetNode): string {
  return formatBudget(node.amount);
}

export function formatBudgetFunding(
  node: BudgetNode,
  source: BudgetFundingSource,
): string {
  return formatBudget(node.values?.[source] ?? 0);
}

export function addChf(
  a: BudgetChfConversion | undefined,
  b: BudgetChfConversion | undefined,
): BudgetChfConversion | undefined {
  if (!b) return a;
  if (!a) return { ...b };
  return {
    ...a,
    amount: a.amount + b.amount,
    usdEquivalent: a.usdEquivalent + b.usdEquivalent,
  };
}
