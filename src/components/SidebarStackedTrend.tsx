"use client";

import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
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

const DEFAULT_HEADING =
  "text-sm font-semibold tracking-wide text-gray-900 uppercase";

export function SidebarStackedTrend({
  heading,
  headingClassName = DEFAULT_HEADING,
  data,
  series,
  showLegend = true,
}: {
  heading?: string;
  headingClassName?: string;
  data: FinancingInstrumentDataPoint[] | null;
  series: FinancingSeries[];
  showLegend?: boolean;
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
          typeof point[item.key] === "number" && Number(point[item.key]) > 0,
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
        />
      </div>
    </section>
  );
}
