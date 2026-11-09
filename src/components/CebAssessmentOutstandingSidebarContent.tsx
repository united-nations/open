"use client";

import { useCallback } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { FinancialPanelHeading } from "@un-eosg/ui/components/financial-panel-parts";
import { CebAssessmentOutstandingNotes } from "@/components/CebAssessmentOutstandingNotes";
import { useYearResource } from "@/hooks/useYearResource";
import {
  loadCebAssessmentOutstanding,
  outstandingDate,
  outstandingRows,
  outstandingSourceUrl,
} from "@/lib/cebAssessmentOutstanding";
import { formatBudget } from "@/lib/contributors";
import { OUTSTANDING_TOTAL_COLOR } from "@/lib/regularBudgetOutstanding";
import { useYearRanges } from "@/lib/useYearRanges";
import { TREND_CHART_MARGIN } from "@/components/charts/trendLayout";
import type { CebAssessmentOutstandingData } from "@/types";

interface OutstandingPlotPoint {
  year: number;
  amount: number | null;
  trend: number | null;
  record: ReturnType<typeof outstandingRows>[number] | null;
  data: CebAssessmentOutstandingData;
}

export function CebAssessmentOutstandingSidebarContent({
  entity,
  year,
}: {
  entity: string;
  year: number;
}) {
  const { years } = useYearRanges().cebAssessmentOutstanding;
  const load = useCallback(async () => {
    const datasets = await Promise.all(years.map(loadCebAssessmentOutstanding));
    return datasets.map((data) => ({
      data,
      rows: outstandingRows(data).filter((row) => row.entity === entity),
    }));
  }, [years, entity]);
  const {
    value: history,
    loading,
    error,
  } = useYearResource(entity, null, false, load, null);
  const selected = history?.find(({ data }) => data.year === year);
  const records = history?.flatMap(({ rows }) => rows) ?? [];
  const multiple = history?.some(({ rows }) => rows.length > 1) ?? false;
  const connect = !multiple;
  const plot = (history ?? []).flatMap<OutstandingPlotPoint>(
    ({ data, rows }) =>
      rows.length
        ? rows.map((record) => ({
            year: data.year,
            amount: record.outstanding,
            trend: connect ? record.outstanding : null,
            record,
            data,
          }))
        : [{ year: data.year, amount: null, trend: null, record: null, data }],
  );
  if (loading || error)
    return (
      <p role="status" className="text-xs text-gray-600">
        {loading
          ? "Loading outstanding assessments…"
          : "Outstanding assessments could not be loaded."}
      </p>
    );
  if (!records.length) return null;
  return (
    <section
      className="space-y-3 border-t border-gray-200 pt-5"
      aria-label="Outstanding assessments"
    >
      <FinancialPanelHeading>Outstanding assessments</FinancialPanelHeading>
      {selected?.rows.length ? (
        selected.rows.map((record) => (
          <div key={record.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                {multiple ? record.label : "Reported outstanding balance"}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {record.outstanding === null
                  ? "Unavailable"
                  : formatBudget(record.outstanding)}
              </span>
            </div>
            <p className="text-xs text-gray-600">{outstandingDate(record)}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-600">
          No outstanding assessment balance reported for {year}.
        </p>
      )}
      <div className="space-y-2">
        <FinancialPanelHeading subheading>
          Reported balances over time
        </FinancialPanelHeading>
        <div
          role="img"
          aria-label={`${entity}: CEB-reported outstanding balances by reporting year, in US dollars.`}
        >
          <ResponsiveContainer width="100%" height={225}>
            <ComposedChart data={plot} margin={TREND_CHART_MARGIN}>
              <CartesianGrid vertical={false} stroke="var(--color-gray-200)" />
              <XAxis
                type="number"
                dataKey="year"
                ticks={years}
                domain={[years[0], years[years.length - 1]]}
                tick={{ fontSize: 11 }}
                tickFormatter={String}
              />
              <YAxis
                type="number"
                dataKey="amount"
                tickFormatter={formatBudget}
                tick={{ fontSize: 11 }}
                width={58}
              />
              <Tooltip
                shared={false}
                content={({ active, payload }) => {
                  const entry: (typeof plot)[number] | undefined =
                    payload?.[0]?.payload;
                  if (!active || !entry?.record) return null;
                  const { record, data } = entry;
                  return (
                    <div className="max-w-sm rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                      <FinancialTooltip
                        title={`${record.label} · ${data.year}`}
                        rows={[
                          {
                            label: "Reported outstanding",
                            value:
                              record.outstanding === null
                                ? "Unavailable"
                                : formatBudget(record.outstanding),
                            color: OUTSTANDING_TOTAL_COLOR,
                          },
                          { label: "As at", value: outstandingDate(record) },
                        ]}
                      />
                      <a
                        href={outstandingSourceUrl(data, record)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-xs underline"
                      >
                        {data.source.symbol}, Table {data.source.table}
                      </a>
                    </div>
                  );
                }}
              />
              {connect && (
                <Line
                  dataKey="trend"
                  stroke={OUTSTANDING_TOTAL_COLOR}
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  tooltipType="none"
                  isAnimationActive={false}
                />
              )}
              <Scatter
                name="Reported outstanding"
                data={plot.filter(({ amount }) => amount !== null)}
                fill={OUTSTANDING_TOTAL_COLOR}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      {selected && <CebAssessmentOutstandingNotes data={selected.data} />}
    </section>
  );
}
