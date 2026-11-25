"use client";

import Link from "next/link";
import {
  FinancialPanelHeading,
  FinancialPanelTotalRow,
} from "@un-eosg/ui/components/financial-panel-parts";
import { usePooledFunds, usePooledFundYear } from "@/hooks/usePooledFunds";
import {
  PooledFundsRankedRows,
  groupPooledRows,
} from "@/components/PooledFundsRankedRows";
import {
  formatPooledAmount,
  pooledFundHref,
  sumPooledAmounts,
} from "@/lib/pooledFunds";

/** Mounted only when pooled funds are enabled; never contributes to CEB totals. */
export function PooledFundsProfileSection({
  kind,
  name,
  year,
}: {
  kind: "contributor" | "organization";
  name: string;
  year: number;
}) {
  const index = usePooledFunds();
  const resource = usePooledFundYear(year);
  if (resource.loading || !index.value || index.error || resource.error) {
    return (
      <section className="space-y-2" data-pooled-funds-profile>
        <FinancialPanelHeading>Pooled funds</FinancialPanelHeading>
        <p role="status" className="text-sm text-gray-600">
          {resource.error || index.error
            ? "Pooled fund data could not be loaded."
            : "Loading pooled fund data…"}
        </p>
      </section>
    );
  }
  if (!resource.available)
    return (
      <section className="space-y-2" data-pooled-funds-profile>
        <FinancialPanelHeading>Pooled funds</FinancialPanelHeading>
        <p className="text-sm text-gray-600">
          Pooled fund data is unavailable for {year}.
        </p>
        <Link
          className="text-sm text-un-blue underline"
          href="/system/pooled-funds/"
        >
          Explore available years
        </Link>
      </section>
    );
  const rows = groupPooledRows(
    Object.entries(resource.value?.funds ?? {}).flatMap(([id, fund]) => {
      const matches =
        kind === "contributor"
          ? fund.contributors
              .filter((row) => row.portalName === name)
              .map((row) => row.deposit)
          : fund.organizations
              .filter((row) => row.portalName === name)
              .map((row) => row.netTransfers);
      return matches.length
        ? [
            {
              id,
              name: index.value!.funds[id].name,
              amount: sumPooledAmounts(matches),
              href: pooledFundHref(id, year),
            },
          ]
        : [];
    }),
  );
  if (!rows.length) return null;
  return (
    <section className="space-y-3" data-pooled-funds-profile>
      <FinancialPanelHeading>Pooled funds</FinancialPanelHeading>
      <FinancialPanelTotalRow
        label={
          kind === "contributor"
            ? "Deposits to pooled funds"
            : "Net transfers from pooled funds"
        }
        value={formatPooledAmount(
          sumPooledAmounts(rows.map((row) => row.amount)),
        )}
      />
      <PooledFundsRankedRows
        key={`${kind}:${name}:${year}`}
        title="Funds"
        rows={rows}
      />
      <p className="text-sm text-gray-600">
        {kind === "contributor"
          ? "Cash deposits, before separately reported donor refunds."
          : "Transfers less refunds to the fund administrator."}{" "}
        Separate from CEB revenue and expenditure; these amounts must not be
        added to the CEB figures.
      </p>
      <Link
        className="inline-flex min-h-10 items-center text-sm text-un-blue underline"
        href={`/system/pooled-funds/?year=${year}`}
      >
        Explore pooled funds
      </Link>
      <a
        className="block text-xs text-gray-500 underline"
        href={`https://mptf.undp.org/analyze-all-${kind === "contributor" ? "contributions" : "projects"}`}
      >
        Source: Multi-Partner Trust Fund Office Gateway · {year} · snapshot{" "}
        {resource.value?.snapshotAt.slice(0, 10)}
      </a>
    </section>
  );
}
