import { uniqueBudgetSources } from "@/lib/budgetSourceCollection";
import type {
  BudgetFundingSource,
  BudgetMetricKey,
  BudgetNode,
  BudgetNodeSource,
} from "@/types";

/** Follow the same year's hierarchy only when a total lacks direct evidence. */
export function budgetTrendSources(
  nodes: readonly BudgetNode[],
  node: BudgetNode,
  metric: BudgetMetricKey,
  fundingKeys: readonly string[],
): BudgetNodeSource[] {
  const children = new Map<string, BudgetNode[]>();
  for (const item of nodes) {
    if (item.parentId)
      children.set(item.parentId, [
        ...(children.get(item.parentId) ?? []),
        item,
      ]);
  }
  const visit = (
    item: BudgetNode,
    funding: BudgetFundingSource,
    visited: Set<string>,
  ): BudgetNodeSource[] => {
    if (visited.has(item.id)) return [];
    visited.add(item.id);
    const direct =
      item.metricSources?.[metric]?.[funding] ??
      (metric === "expenditure" && item.sources?.[funding]
        ? [item.sources[funding]!]
        : []);
    if (direct.length) return direct;
    return (children.get(item.id) ?? []).flatMap((child) =>
      visit(child, funding, visited),
    );
  };
  return uniqueBudgetSources(
    fundingKeys.flatMap((funding) =>
      visit(node, funding as BudgetFundingSource, new Set()),
    ),
  );
}
