import type { BudgetNode, BudgetFundingSource, BudgetChfLayout } from "@/types";
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
  return formatBudget(amount).replace("$", "CHF ");
}

export function formatCurrencyParts(usd: number, chf: number): string {
  if (Math.abs(usd) < 0.005) return formatChf(chf);
  if (chf === 0) return formatBudget(usd);
  return `${formatBudget(usd)} + ${formatChf(chf)}`;
}

export function formatBudgetNode(node: BudgetNode): string {
  return node.chf
    ? formatCurrencyParts(node.amount - node.chf.usdForLayout, node.chf.amount)
    : formatBudget(node.amount);
}

export function formatBudgetFunding(
  node: BudgetNode,
  source: BudgetFundingSource,
): string {
  const amount = node.values?.[source] ?? 0;
  return source === "extrabudgetary" && node.chf
    ? formatCurrencyParts(amount - node.chf.usdForLayout, node.chf.amount)
    : formatBudget(amount);
}

export function addChf(
  a: BudgetChfLayout | undefined,
  b: BudgetChfLayout | undefined,
): BudgetChfLayout | undefined {
  if (!b) return a;
  if (!a) return { ...b };
  return {
    ...a,
    amount: a.amount + b.amount,
    usdForLayout: a.usdForLayout + b.usdForLayout,
  };
}
