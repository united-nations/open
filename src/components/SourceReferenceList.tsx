import { ExternalLink } from "lucide-react";
import type { BudgetNodeSource } from "@/types";
import {
  sourcePages,
  sourcePageUrl,
  sourceDocumentUrl,
  sourceDownloads,
  uniqueSourceReferences,
} from "@/lib/sourceReferences";

/** Shared citation table; callers place it inside their source disclosure. */
export function SourceReferenceList({
  references,
}: {
  references: readonly BudgetNodeSource[];
}) {
  const unique = uniqueSourceReferences(references);
  // Keep short figure-by-figure lists; long disclosures share one link per
  // document/page set, with the complete row locators available underneath.
  if (unique.length > 8) return <GroupedReferences references={unique} />;
  return (
    <div className="space-y-3">
      {references.some(
        (source) =>
          (source.pdfPageScope === "table" ||
            (source.pageStatus === "located" && !source.pdfPageScope)) &&
          sourcePages(source).length > 0,
      ) && (
        <p className="text-sm text-gray-600">
          Table references locate the source table; rows in a table spanning
          several pages may continue on later pages.
        </p>
      )}
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <caption className="sr-only">
          Budget figures and their source references
        </caption>
        <colgroup>
          <col className="w-2/5" />
          <col className="w-3/5" />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-300">
            <th scope="col" className="py-2 pe-3 font-semibold">
              Budget item / figure
            </th>
            <th scope="col" className="py-2 font-semibold">
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {unique.map((source, index) => {
            const pages = sourcePages(source);
            return (
              <tr key={index} className="border-b border-gray-200 align-top">
                <th
                  scope="row"
                  className="py-3 pe-3 text-start font-normal break-words"
                >
                  <div className="font-medium">
                    {source.budgetItem ||
                      source.label ||
                      source.rowLabel ||
                      "Budget total"}
                  </div>
                  {source.budgetItem && source.label && (
                    <p className="mt-1">{source.label}</p>
                  )}
                  {source.columnHeader && (
                    <p className="mt-1 text-gray-600">{source.columnHeader}</p>
                  )}
                </th>
                <td className="py-3 break-words">
                  <a
                    href={
                      pages.length
                        ? sourcePageUrl(source.url, pages[0])
                        : sourceDocumentUrl(source.url)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 text-un-blue hover:underline"
                  >
                    <span>{source.symbol || "Source document"}</span>
                    <ExternalLink
                      aria-hidden="true"
                      className="mt-0.5 size-3 shrink-0"
                    />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {pages.length ? (
                    <p className="mt-1 flex flex-wrap gap-x-1">
                      <span>
                        {pages.length === 1 ? "PDF page:" : "PDF pages:"}
                      </span>
                      {pages.map((page, i) => (
                        <span key={page}>
                          <a
                            href={sourcePageUrl(source.url, page)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-un-blue underline"
                            aria-label={`${source.symbol}, PDF page ${page} (opens in a new tab)`}
                          >
                            {page}
                          </a>
                          {i < pages.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-1 text-gray-600">Document reference</p>
                  )}
                  {pages.length > 0 && source.pdfPageScope === "table" && (
                    <p className="mt-1 text-gray-600">Table reference</p>
                  )}
                  {pages.length > 0 && source.pdfPageScope === "section" && (
                    <p className="mt-1 text-gray-600">Section reference</p>
                  )}
                  {sourceDownloads(source.url) && (
                    <p className="mt-1 text-gray-600">
                      Downloads PDF; open it and go to the PDF page shown.
                    </p>
                  )}
                  {source.tableTitle && (
                    <p className="mt-1 text-gray-600">
                      Table: {source.tableTitle}
                    </p>
                  )}
                  {source.rowLabel && (
                    <p className="mt-1 text-gray-600">Row: {source.rowLabel}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupedReferences({
  references,
}: {
  references: readonly BudgetNodeSource[];
}) {
  const groups = new Map<string, BudgetNodeSource[]>();
  for (const source of references) {
    const key = JSON.stringify([
      sourceDocumentUrl(source.url).split("#")[0],
      sourcePages(source),
    ]);
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }
  return (
    <div className="space-y-3 text-xs" data-grouped-source-references>
      {[...groups].map(([key, rows]) => {
        const source = rows[0];
        const pages = sourcePages(source);
        return (
          <div key={key} className="border-b border-gray-200 pb-3">
            <p className="font-medium break-words">
              {source.symbol || "Source document"}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-2">
              {pages.length ? (
                pages.map((page) => (
                  <a
                    key={page}
                    href={sourcePageUrl(source.url, page)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue underline"
                    aria-label={`${source.symbol}, PDF page ${page} (opens in a new tab)`}
                  >
                    PDF p. {page}
                  </a>
                ))
              ) : (
                <a
                  href={sourceDocumentUrl(source.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-un-blue underline"
                >
                  Source document (opens in a new tab)
                </a>
              )}
            </p>
            {sourceDownloads(source.url) && (
              <p className="mt-1 text-gray-600">
                Downloads PDF; open it and go to the PDF page shown.
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-600">
                {rows.length} cited {rows.length === 1 ? "row" : "rows"} ·
                Figure and row details
              </summary>
              <ul className="mt-2 space-y-3">
                {rows.map((row, index) => (
                  <li key={index} className="break-words">
                    <p className="font-medium">
                      {row.budgetItem || row.label || "Budget figure"}
                    </p>
                    {row.budgetItem && row.label && <p>{row.label}</p>}
                    {row.columnHeader && <p>{row.columnHeader}</p>}
                    {row.tableTitle && <p>Table: {row.tableTitle}</p>}
                    {row.rowLabel && <p>Row: {row.rowLabel}</p>}
                    {row.pdfPageScope === "table" && <p>Table reference</p>}
                    {row.pdfPageScope === "section" && <p>Section reference</p>}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        );
      })}
    </div>
  );
}
