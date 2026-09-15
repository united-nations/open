"use client";

import type { BudgetNodeSource } from "@/types";
import { sourcePages, sourcePageUrl } from "@/lib/sourceReferences";

/** Compact, page-specific evidence for financial tooltip content. */
export function SourceReferenceLinks({
  references,
}: {
  references: readonly BudgetNodeSource[];
}) {
  const groups = new Map<
    string,
    { source: BudgetNodeSource; pages: Map<number, Set<string>> }
  >();
  for (const source of references) {
    const pages = sourcePages(source);
    if (!pages.length) continue;
    const key = `${source.url.split("#")[0]}|${source.pdfPageScope ?? "table"}`;
    const group = groups.get(key) ?? {
      source,
      pages: new Map<number, Set<string>>(),
    };
    for (const page of pages) {
      const labels = group.pages.get(page) ?? new Set<string>();
      labels.add(
        [source.budgetItem, source.label, source.rowLabel, source.columnHeader]
          .filter(Boolean)
          .join(" · "),
      );
      group.pages.set(page, labels);
    }
    groups.set(key, group);
  }
  if (!groups.size) return null;
  return (
    <div
      className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-gray-200 pt-2 text-xs"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="font-medium">Source pages</p>
      {[...groups].map(([key, { source, pages }]) => (
        <div key={key} className="flex flex-wrap items-baseline gap-x-1">
          <span>{source.symbol || "Source document"}:</span>
          {[...pages]
            .sort(([a], [b]) => a - b)
            .map(([page, labels]) => (
              <a
                key={page}
                href={sourcePageUrl(source.url, page)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue underline"
                title={[...labels].join("\n")}
                aria-label={`${source.symbol}, PDF page ${page} (opens in a new tab)`}
              >
                p. {page}
              </a>
            ))}
          {source.pdfPageScope !== "row" && (
            <span className="text-gray-600">
              ({source.pdfPageScope === "section" ? "section" : "table"})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
