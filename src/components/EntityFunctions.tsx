"use client";
import {
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useFunctionExpenses } from "@/hooks/useFunctionExpenses";
import { UN_FUNCTIONS } from "@/lib/functions";
import { formatBudget } from "@/lib/entities";

export function EntityFunctions({
  entity,
  year,
}: {
  entity: string;
  year: number;
}) {
  const { data, error } = useFunctionExpenses();
  const amounts = data?.data.find((row) => row.year === year)?.entities[entity];
  if (!amounts)
    return (
      <section className="mt-4 space-y-2">
        <FinancialPanelHeading subheading>
          Spending by function
        </FinancialPanelHeading>
        <p className="text-sm text-slate-600">
          {error
            ? "Function data could not be loaded."
            : !data
              ? "Loading function data…"
              : year < 2018
                ? "The current CEB function classification is available from 2018."
                : "CEB does not report a function breakdown for this entity and year."}
        </p>
      </section>
    );
  const maximum = Math.max(1, ...Object.values(amounts).map(Math.abs));
  return (
    <section className="mt-4 space-y-2">
      <FinancialPanelHeading subheading>
        Spending by function
      </FinancialPanelHeading>
      {UN_FUNCTIONS.map((item) => (
        <FinancialPanelRankedRow
          key={item.key}
          label={item.label}
          value={
            amounts[item.key] === undefined
              ? "—"
              : formatBudget(amounts[item.key]!)
          }
        >
          <FinancialPanelBar
            color={item.color}
            percent={(Math.max(0, amounts[item.key] ?? 0) / maximum) * 100}
          />
        </FinancialPanelRankedRow>
      ))}
    </section>
  );
}
