import { ExternalLink } from "lucide-react";
import type { BudgetNodeSource } from "@/types";
import {
  sourcePages,
  sourcePageUrl,
  uniqueSourceReferences,
} from "@/lib/sourceReferences";

/** Shared citation table; callers place it inside their source disclosure. */
export function SourceReferenceList({
  references,
}: {
  references: readonly BudgetNodeSource[];
}) {
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
          {uniqueSourceReferences(references).map((source, index) => {
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
                        : source.url
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
