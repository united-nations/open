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
  const metricSources = node.metricSources?.[metric] ?? {};
  const fundingReferences = Object.entries(metricSources).flatMap(
    ([funding, sources]) =>
      (sources ?? []).map((source) => ({
        ...source,
        label:
          source.label ??
          FUNDING_SOURCES[funding as BudgetFundingSource]?.label,
      })),
  );
  if (metric !== "expenditure") {
    return uniqueBudgetSources(contextualize(fundingReferences));
  }

  // Legacy exports also carry an all-source and a generic citation. These
  // sometimes point to just the first funding subtotal of a derived sum.
  // Prefer the precise funding context instead of relabelling that row as a total.
  const sources = contextualize([
    ...fundingReferences,
    ...Object.entries(node.sources ?? {})
      .filter(
        ([funding]) =>
          funding !== "total_all_sources" &&
          !metricSources[funding as BudgetFundingSource]?.length,
      )
      .flatMap(([funding, source]) =>
        source
          ? [
              {
                ...source,
                label:
                  source.label ??
                  FUNDING_SOURCES[funding as BudgetFundingSource]?.label,
              },
            ]
          : [],
      ),
  ]);
  const evidence = new Set(sources.map(budgetSourceEvidenceKey));
  const appendEvidence = (references: BudgetNodeSource[]) => {
    for (const source of contextualize(references)) {
      const key = budgetSourceEvidenceKey(source);
      if (evidence.has(key)) continue;
      evidence.add(key);
      sources.push(source);
    }
  };
  appendEvidence(node.supportingSources ?? []);
  if (node.chf) appendEvidence([node.chf.source, node.chf.rateSource]);
  const totalSource = node.sources?.total_all_sources;
  if (totalSource) {
    appendEvidence([
      { ...totalSource, label: totalSource.label ?? "All funding sources" },
    ]);
  }
  if (node.source) appendEvidence([node.source]);
  return uniqueBudgetSources(sources);
}

/** Same published evidence within one budget item, independently of UI labels. */
function budgetSourceEvidenceKey(source: BudgetNodeSource): string {
  return JSON.stringify([
    source.url.split("#")[0],
    sourcePages(source),
    source.symbol,
    source.tableTitle,
    source.rowLabel,
    source.columnHeader,
    source.budgetItem,
  ]);
}

export function uniqueBudgetSources(
  sources: BudgetNodeSource[],
): BudgetNodeSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = JSON.stringify([
      budgetSourceEvidenceKey(source),
      source.sourceCellId,
      source.operand?.amount,
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
