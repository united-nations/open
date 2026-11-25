"use client";

import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { FinancialFlowColumnSelect } from "@/components/FinancialFlowColumnSelect";
import { YearSlider } from "@/components/YearSlider";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import {
  formatPooledAmount,
  pooledFundColor,
  POOLED_FUND_METRICS,
} from "@/lib/pooledFunds";
import type {
  PooledFundsIndex,
  PooledFundYearSummary,
  PooledFundMetric,
} from "@/types";

export function PooledFundsTreemap({
  data,
  annual,
  metric,
  search,
  onSearch,
  typology,
  onTypology,
  onYear,
  onFund,
}: {
  data: PooledFundsIndex;
  annual: PooledFundYearSummary;
  metric: PooledFundMetric;
  search: string;
  onSearch: (value: string) => void;
  typology: string;
  onTypology: (value: string) => void;
  onYear: (year: number) => void;
  onFund: (id: string) => void;
}) {
  const definition = POOLED_FUND_METRICS[metric];
  const types = [
    ...new Set(
      Object.values(annual.funds).map(
        (fund) => fund.typology ?? "Not specified",
      ),
    ),
  ].sort();
  const entries = Object.entries(annual.funds).map(([id, amounts]) => ({
    ...data.funds[id],
    ...amounts,
    category: amounts.category ?? "Not specified",
  }));
  const matching = entries.filter(
    (fund) =>
      (typology === "all" || (fund.typology ?? "Not specified") === typology) &&
      `${fund.name} ${fund.id} ${fund.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  // Annual source observations can be unavailable. Never turn their nulls into zero.
  const reported = matching.filter((fund) => fund[metric] !== null);
  const signedTotal = reported.reduce(
    (sum, fund) => sum + (fund[metric] ?? 0),
    0,
  );
  const groups = [...new Set(matching.map((fund) => fund.category))];
  return (
    <GroupedTreemap
      className="[&>div:nth-child(2)]:flow-root"
      controlsClassName="self-start"
      rows={groups.map((category) => ({
        key: category,
        label: category,
        color: pooledFundColor(category),
        leaves: matching
          .filter(
            (fund) => fund.category === category && (fund[metric] ?? 0) > 0,
          )
          .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))
          .map((fund) => ({
            key: fund.id,
            label: fund.name,
            value: fund[metric]!,
            color: pooledFundColor(category),
            onActivate: () => onFund(fund.id),
          })),
      }))}
      additionalListItems={matching
        .filter((fund) => fund[metric] === null || fund[metric]! <= 0)
        .map((fund) => ({
          id: fund.id,
          label: fund.name,
          value: formatPooledAmount(fund[metric]),
          amount: fund[metric] ?? 0,
          group: { key: fund.category, label: fund.category },
          description: fund.category,
          onOpen: () => onFund(fund.id),
        }))}
      showRowLabels
      showLeafValues
      plotClassName={SYSTEM_TREEMAP_HEIGHT_CLASS}
      totalLabel={definition.totalLabel}
      summaries={[
        {
          key: "total",
          label: definition.totalLabel,
          value: formatPooledAmount(reported.length ? signedTotal : null),
        },
      ]}
      formatValue={formatPooledAmount}
      formatAccessibleValue={formatPooledAmount}
      search={{
        value: search,
        onChange: onSearch,
        label: "Search pooled funds",
        placeholder: "Search funds…",
        predicate: () => true,
      }}
      searchAccessory={
        <div role="group" aria-label="Fund typology">
          <FinancialFlowColumnSelect
            label="Fund typology"
            value={typology}
            onChange={onTypology}
            compact
            contentClassName="w-72 max-w-[calc(100vw-2rem)]"
            options={[
              { value: "all", label: "All fund types" },
              ...(typology !== "all" && !types.includes(typology)
                ? [
                    {
                      value: typology,
                      label: `${typology} (unavailable in ${annual.year})`,
                    },
                  ]
                : []),
              ...types.map((type) => ({ value: type, label: type })),
            ]}
          />
        </div>
      }
      yearControl={
        <YearSlider
          years={data.meta.years}
          selectedYear={annual.year}
          onChange={onYear}
        />
      }
      renderTooltip={({ row, leaf }) => (
        <FinancialTooltip
          title={leaf.label}
          parents={[{ label: row.label, color: row.color }]}
          total={{
            label: definition.shortLabel,
            value: formatPooledAmount(leaf.value),
          }}
          actionHint="Click to explore details"
        />
      )}
      emptyContent="No positive reported amounts match these filters. Use List to inspect other observations."
    />
  );
}
