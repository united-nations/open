"use client";

import {
  FinancialPanelBreakdownRow,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";
import { formatBudget } from "@/lib/entities";

export interface FinancialFlowBreakdownRow {
  id: string;
  label: string;
  amount: number;
  color?: string;
  onClick?: () => void;
}

export function FinancialFlowBreakdown({
  heading,
  rows,
  limit = 8,
}: {
  heading: string;
  rows: FinancialFlowBreakdownRow[];
  limit?: number;
}) {
  const maximum = Math.max(0, ...rows.map((row) => row.amount));
  const renderRow = (row: FinancialFlowBreakdownRow) => (
    <FinancialPanelBreakdownRow
      key={row.id}
      label={
        row.onClick ? (
          <button
            type="button"
            onClick={row.onClick}
            className="text-start underline underline-offset-2 hover:text-un-blue-text"
          >
            {row.label}
          </button>
        ) : (
          row.label
        )
      }
      value={formatBudget(row.amount)}
      percent={maximum > 0 ? (Math.max(0, row.amount) / maximum) * 100 : 0}
      color={row.color ?? "var(--color-un-blue)"}
    />
  );
  return (
    <FinancialPanelSection heading={heading}>
      <div className="space-y-3">{rows.slice(0, limit).map(renderRow)}</div>
      {rows.length > limit && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm underline underline-offset-2">
            Show all {rows.length} items
          </summary>
          <div className="mt-3 space-y-3">
            {rows.slice(limit).map(renderRow)}
          </div>
        </details>
      )}
    </FinancialPanelSection>
  );
}
