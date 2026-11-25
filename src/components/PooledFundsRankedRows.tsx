"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { formatPooledAmount, sumPooledAmounts } from "@/lib/pooledFunds";

export interface PooledRankedRow {
  id: string;
  name: string;
  amount: number | null;
  href?: string;
}
export function groupPooledRows(rows: PooledRankedRow[]): PooledRankedRow[] {
  const groups = new Map<string, PooledRankedRow[]>();
  for (const row of rows) {
    const key = `${row.id}:${row.href ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()]
    .map((values) => ({
      ...values[0],
      amount: sumPooledAmounts(values.map((row) => row.amount)),
    }))
    .sort(
      (a, b) =>
        (b.amount ?? -Infinity) - (a.amount ?? -Infinity) ||
        a.name.localeCompare(b.name),
    );
}
export function PooledFundsRankedRows({
  title,
  rows,
  color = "#009edb",
}: {
  title: string;
  rows: PooledRankedRow[];
  color?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const visible = groupPooledRows(rows).filter((row) => row.amount !== 0);
  if (!visible.length) return null;
  const maximum = Math.max(
    1,
    ...visible.map((row) => Math.abs(row.amount ?? 0)),
  );
  return (
    <section className="space-y-2">
      <FinancialPanelHeading subheading>{title}</FinancialPanelHeading>
      {(showAll ? visible : visible.slice(0, 10)).map((row) => (
        <FinancialPanelRankedRow
          key={`${row.id}:${row.href ?? ""}`}
          label={row.name}
          value={formatPooledAmount(row.amount)}
          onClick={row.href ? () => router.push(row.href!) : undefined}
        >
          <FinancialPanelBar
            percent={(Math.max(0, row.amount ?? 0) / maximum) * 100}
            color={color}
          />
        </FinancialPanelRankedRow>
      ))}
      {visible.length > 10 && (
        <button
          className="min-h-10 text-sm text-un-blue hover:underline"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show fewer" : `Show all ${visible.length}`}
        </button>
      )}
    </section>
  );
}
