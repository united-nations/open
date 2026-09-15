import type { BudgetNodeSource } from "@/types";

/** Use physical PDF pages only; never infer a page from a table or row number. */
export function sourcePages(source: BudgetNodeSource): number[] {
  const pages = source.pdfPages ?? (source.pdfPage ? [source.pdfPage] : []);
  return [
    ...new Set(pages.filter((page) => Number.isInteger(page) && page > 0)),
  ].sort((a, b) => a - b);
}

export function sourcePageUrl(url: string, page: number): string {
  const [base, fragment = ""] = url.split("#", 2);
  const params = new URLSearchParams(fragment);
  params.set("page", String(page));
  return `${base}#${params.toString()}`;
}

export function uniqueSourceReferences(
  references: readonly BudgetNodeSource[],
): BudgetNodeSource[] {
  const seen = new Set<string>();
  return references.filter((source) => {
    const key = JSON.stringify([
      source.url.split("#")[0],
      sourcePages(source),
      source.symbol,
      source.label,
      source.budgetItem,
      source.tableTitle,
      source.rowLabel,
      source.columnHeader,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
