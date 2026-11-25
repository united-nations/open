"use client";

import type { BudgetNodeSource } from "@/types";
import {
  sourcePages,
  sourcePageUrl,
  sourceDocumentUrl,
  sourceDownloads,
} from "@/lib/sourceReferences";

/** Compact, page-specific evidence. The containing tooltip or panel owns scrolling. */
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
    const key = `${sourceDocumentUrl(source.url).split("#")[0]}|${source.pdfPageScope ?? "table"}`;
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
  const symbolUrls = new Map<string, Set<string>>();
  for (const { source } of groups.values()) {
    const symbol = source.symbol ?? "";
    const urls = symbolUrls.get(symbol) ?? new Set<string>();
    urls.add(sourceDocumentUrl(source.url).split("#")[0]);
    symbolUrls.set(symbol, urls);
  }
  return (
    <div
      className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-xs"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="font-medium">Source pages</p>
      {[...groups].map(([key, { source, pages }]) => (
        <div key={key} className="flex flex-wrap items-baseline gap-x-1">
          <span>{source.symbol || "Source document"}:</span>
          {(symbolUrls.get(source.symbol ?? "")?.size ?? 0) > 1 && (
            <span className="text-gray-600">
              {source.label ||
                source.tableTitle ||
                source.url.split("/").pop()?.split("#")[0]}
            </span>
          )}
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
                aria-label={`${source.symbol}${(symbolUrls.get(source.symbol ?? "")?.size ?? 0) > 1 ? ` · ${source.label || source.tableTitle || source.url.split("/").pop()?.split("#")[0]}` : ""}, PDF page ${page} (opens in a new tab)`}
              >
                p. {page}
              </a>
            ))}
          {source.pdfPageScope !== "row" && (
            <span className="text-gray-600">
              ({source.pdfPageScope === "section" ? "section" : "table"})
            </span>
          )}
          {sourceDownloads(source.url) && (
            <span className="text-gray-600">
              (downloads PDF; go to the page shown)
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
