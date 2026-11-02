"use client";

import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import type { BudgetNodeSource } from "@/types";
import { fundingSources } from "@un-eosg/ui/funding-sources";
import { FUNDING_SOURCES } from "@/lib/budgetGroupings";

export type { FinancingInstrumentDataPoint, FinancingSeries };

export const FUNDING_SOURCE_TREND_SERIES: FinancingSeries[] = (
  ["regular_budget", "other_assessed", "extrabudgetary"] as const
).map((key) => ({
  key,
  label: FUNDING_SOURCES[key].label,
  color: fundingSources[key].color,
}));

const DEFAULT_HEADING = "text-base font-semibold text-gray-900";

export function SidebarStackedTrend({
  heading,
  headingClassName = DEFAULT_HEADING,
  data,
  series,
  showLegend = true,
  allowNegative = false,
  tooltipSources,
  valueFormatter,
  currencyLabel,
}: {
  heading?: string;
  headingClassName?: string;
  data: FinancingInstrumentDataPoint[] | null;
  series: FinancingSeries[];
  showLegend?: boolean;
  allowNegative?: boolean;
  valueFormatter?: (value: number) => string;
  currencyLabel?: string;
  tooltipSources?: (year: string, visibleKeys: string[]) => BudgetNodeSource[];
}) {
  if (data === null) {
    return (
      <section>
        {heading && <h3 className={headingClassName}>{heading}</h3>}
        <p className="mt-2 text-sm text-gray-500">Loading trend…</p>
      </section>
    );
  }

  const hasTrend =
    data.length >= 2 &&
    series.some((item) =>
      data.some(
        (point) =>
          typeof point[item.key] === "number" &&
          (allowNegative
            ? Number(point[item.key]) !== 0
            : Number(point[item.key]) > 0),
      ),
    );
  if (!hasTrend) return null;

  return (
    <section>
      {heading && <h3 className={headingClassName}>{heading}</h3>}
      <div className={heading ? "mt-3" : undefined}>
        <FinancingInstrumentChart
          data={data}
          series={series}
          showLegend={showLegend}
          compact
          allowNegative={allowNegative}
          tooltipSources={tooltipSources}
          valueFormatter={valueFormatter}
          currencyLabel={currencyLabel}
          accessibleTableLabel="Funding-source trend"
        />
      </div>
      {data.some((point) =>
        series.some((item) => point[item.key] === null),
      ) && (
        <p className="mt-2 text-xs text-gray-500" role="status">
          Some funding-source observations are unavailable. Gaps do not
          represent zero spending.
        </p>
      )}
    </section>
  );
}
