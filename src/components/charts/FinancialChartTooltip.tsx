"use client";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import type { BudgetNodeSource } from "@/types";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatBudget } from "@un-eosg/ui/format-budget";

/** Adapter only: Recharts keeps its own positioning and series selection. */
export function FinancialChartTooltip({
  active,
  label,
  payload,
  formatValue = formatBudget,
  title,
  totalLabel,
  showBars = false,
  sources = [],
  unitLabel,
}: {
  active?: boolean;
  label?: unknown;
  payload?: readonly {
    name?: unknown;
    value?: unknown;
    color?: string;
    dataKey?: unknown;
  }[];
  formatValue?: (value: number) => string;
  title?: string;
  totalLabel?: string;
  showBars?: boolean;
  sources?: readonly BudgetNodeSource[];
  unitLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter(
    (entry) => typeof entry.value === "number" && Number.isFinite(entry.value),
  );
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, entry) => sum + Number(entry.value), 0);
  return (
    <div className="max-w-sm rounded-md border border-gray-200 bg-white px-3 py-2 shadow-lg">
      {unitLabel && <p className="mb-1 text-xs text-gray-500">{unitLabel}</p>}
      <FinancialTooltip
        title={
          title ??
          (typeof label === "string" || typeof label === "number"
            ? String(label)
            : undefined)
        }
        total={
          totalLabel
            ? { label: totalLabel, value: formatValue(total) }
            : undefined
        }
        rows={entries.map((entry) => ({
          label: String(entry.name ?? entry.dataKey ?? "Amount"),
          value: formatValue(Number(entry.value)),
          color: entry.color,
          share:
            showBars && total > 0 && Number(entry.value) >= 0
              ? Number(entry.value) / total
              : undefined,
        }))}
      />
      <SourceReferenceLinks references={sources} />
    </div>
  );
}
