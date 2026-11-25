import { formatCurrency } from "@un-eosg/ui/format-budget";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import {
  sourceDownloads,
  sourcePages,
  sourcePageUrl,
} from "@/lib/sourceReferences";
import type { BudgetNodeSource } from "@/types";

export function SourceCalculation({
  references,
  amount,
  currency = "USD",
}: {
  references: readonly BudgetNodeSource[];
  amount: number;
  currency?: "USD" | "CHF";
}) {
  const complete =
    references.length > 0 &&
    references.every(
      (source) =>
        source.operand?.currency === currency && sourcePages(source).length > 0,
    );
  const sum = references.reduce(
    (total, source) => total + (source.operand?.amount ?? 0),
    0,
  );
  if (!complete || Math.abs(sum - amount) >= 0.005) {
    return <SourceReferenceLinks references={references} />;
  }
  const format = (value: number) => formatCurrency(value, currency);
  // Keep expanded inputs in the containing tooltip or panel's scroll area.
  const inputs = (
    <ul className="mt-2 space-y-2 text-start text-xs">
      {references.map((source, index) => (
        <li key={index} className="grid grid-cols-[1fr_auto] gap-x-3">
          <span>
            {source.label}
            {source.rowLabel && (
              <span className="block">{source.rowLabel}</span>
            )}
            {(source.tableTitle || source.columnHeader) && (
              <span className="block text-gray-600">
                {[source.tableTitle, source.columnHeader]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </span>
          <span className="text-end tabular-nums">
            {sourcePages(source).map((page, pageIndex) => (
              <a
                key={page}
                href={sourcePageUrl(source.url, page)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-un-blue underline"
                aria-label={`${format(source.operand!.amount)} · ${source.symbol} · ${source.label ?? source.rowLabel} · PDF page ${page}`}
              >
                {pageIndex === 0 && (
                  <span className="block">
                    {format(source.operand!.amount)}
                  </span>
                )}
                {sourceDownloads(source.url) ? "Download · " : ""}p. {page}
              </a>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
  return references.length === 1 ? (
    inputs
  ) : (
    <details className="mt-2 border-t border-gray-200 pt-2 text-start text-xs">
      <summary tabIndex={0} className="cursor-pointer font-medium">
        Calculation · {format(amount)} · {references.length} inputs
      </summary>
      {inputs}
    </details>
  );
}
