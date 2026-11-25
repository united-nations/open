"use client";

import { useCallback } from "react";
import { FinancialPanelHeading } from "@un-eosg/ui/components/financial-panel-parts";
import { CebAssessmentOutstandingNotes } from "@/components/CebAssessmentOutstandingNotes";
import { useYearResource } from "@/hooks/useYearResource";
import {
  loadCebAssessmentOutstanding,
  outstandingDate,
  outstandingHistory,
} from "@/lib/cebAssessmentOutstanding";
import { CebAssessmentOutstandingPlot } from "@/components/CebAssessmentOutstandingPlot";
import { formatBudget } from "@/lib/contributors";
import { useYearRanges } from "@/lib/useYearRanges";

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
    return outstandingHistory(datasets, entity);
  }, [years, entity]);
  const {
    value: history,
    loading,
    error,
  } = useYearResource(entity, null, false, load, null);
  const selected = history?.find(({ data }) => data.year === year);
  const records = history?.flatMap(({ rows }) => rows) ?? [];
  const multiple = history?.some(({ rows }) => rows.length > 1) ?? false;
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
        <CebAssessmentOutstandingPlot
          history={history ?? []}
          entity={entity}
          height={225}
        />
      </div>
      {selected && <CebAssessmentOutstandingNotes data={selected.data} />}
    </section>
  );
}
