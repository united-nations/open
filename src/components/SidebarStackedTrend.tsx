"use client";

import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/charts/FinancingInstrumentChart";
import { FINANCING_INSTRUMENT_COLORS } from "@/lib/financingInstruments";
import { FUNDING_SOURCES } from "@/lib/budgetGroupings";

export type { FinancingInstrumentDataPoint, FinancingSeries };

export const FUNDING_SOURCE_TREND_SERIES: FinancingSeries[] = (
  ["regular_budget", "other_assessed", "extrabudgetary"] as const
).map((key) => ({
  key,
  label: FUNDING_SOURCES[key].label,
  color:
    key === "regular_budget"
      ? FINANCING_INSTRUMENT_COLORS.assessed
      : key === "other_assessed"
        ? FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked
        : FINANCING_INSTRUMENT_COLORS.voluntary_earmarked,
}));

const DEFAULT_HEADING =
  "text-sm font-semibold tracking-wide text-gray-900 uppercase";

export function SidebarStackedTrend({
  heading,
  headingClassName = DEFAULT_HEADING,
  data,
  series,
}: {
  heading: string;
  headingClassName?: string;
  data: FinancingInstrumentDataPoint[] | null;
  series: FinancingSeries[];
}) {
  if (data === null) {
    return (
      <section>
        <h3 className={headingClassName}>{heading}</h3>
        <p className="mt-2 text-sm text-gray-500">Loading trend…</p>
      </section>
    );
  }

  const hasTrend = data.length >= 2 && series.some((item) =>
    data.some(
      (point) => typeof point[item.key] === "number" && Number(point[item.key]) > 0,
    ),
  );
  if (!hasTrend) return null;

  return (
    <section>
      <h3 className={headingClassName}>{heading}</h3>
      <div className="mt-3">
        <FinancingInstrumentChart data={data} series={series} compact />
      </div>
    </section>
  );
}
