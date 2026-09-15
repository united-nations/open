import { sourcePages } from "@/lib/sourceReferences";
import { FUNDING_SOURCES } from "@/lib/budgetGroupings";
import type {
  BudgetFundingSource,
  BudgetNode,
  BudgetNodeSource,
  BudgetMetricKey,
} from "@/types";

/** References describe evidence, never a substitute financial total. */
export function collectBudgetNodeSources(
  node: BudgetNode,
  metric: BudgetMetricKey = "expenditure",
): BudgetNodeSource[] {
  const contextualize = (sources: BudgetNodeSource[]) =>
    sources.map((source) => ({
      ...source,
      budgetItem:
        source.budgetItem ??
        (node.code && !node.label.includes(node.code)
          ? `${node.code} · ${node.label}`
          : node.label),
    }));
  if (metric !== "expenditure") {
    return uniqueBudgetSources(
      contextualize(Object.values(node.metricSources?.[metric] ?? {}).flat()),
    );
  }
  const metricSources = node.metricSources?.expenditure ?? {};
  const sources = [
    ...Object.values(metricSources).flat(),
    ...Object.entries(node.sources ?? {})
      .filter(
        ([funding]) => !metricSources[funding as BudgetFundingSource]?.length,
      )
      .map(
        ([funding, source]) =>
          source && {
            ...source,
            label:
              funding === "total_all_sources"
                ? "All funding sources"
                : FUNDING_SOURCES[funding as BudgetFundingSource]?.label,
          },
      ),
    node.source,
    ...(node.supportingSources ?? []),
  ].filter((source): source is BudgetNodeSource => Boolean(source));
  return uniqueBudgetSources(contextualize(sources));
}

export function uniqueBudgetSources(
  sources: BudgetNodeSource[],
): BudgetNodeSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = JSON.stringify([
      source.url,
      sourcePages(source),
      source.tableTitle,
      source.rowLabel,
      source.columnHeader,
      source.budgetItem,
      source.label,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Include evidence for the selected total and the breakdown shown below it. */
export function collectBudgetHierarchySources(
  node: BudgetNode,
  childrenByParent: Record<string, BudgetNode[]>,
  metric: BudgetMetricKey = "expenditure",
): BudgetNodeSource[] {
  const references: BudgetNodeSource[] = [];
  const visited = new Set<string>();
  const visit = (current: BudgetNode) => {
    if (visited.has(current.id)) return;
    visited.add(current.id);
    references.push(...collectBudgetNodeSources(current, metric));
    for (const child of childrenByParent[current.id] ?? []) visit(child);
  };
  visit(node);
  return uniqueBudgetSources(references);
}
