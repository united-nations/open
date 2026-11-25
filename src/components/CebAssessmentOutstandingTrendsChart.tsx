"use client";

import { useCallback, useState } from "react";
import { HierarchicalSingleSelect } from "@un-eosg/ui/components/hierarchical-single-select";
import { ChartHeading } from "@/components/ContentHeading";
import { CebAssessmentOutstandingPlot } from "@/components/CebAssessmentOutstandingPlot";
import { useYearResource } from "@/hooks/useYearResource";
import {
  loadCebAssessmentOutstanding,
  outstandingHistory,
} from "@/lib/cebAssessmentOutstanding";
import { CEB_ASSESSMENT_OUTSTANDING_HISTORY_YEAR_RANGE } from "@/lib/useYearRanges";

const { years } = CEB_ASSESSMENT_OUTSTANDING_HISTORY_YEAR_RANGE;

export function CebAssessmentOutstandingTrendsChart() {
  const [selected, setSelected] = useState("UN Secretariat");
  const load = useCallback(
    () => Promise.all(years.map(loadCebAssessmentOutstanding)),
    [],
  );
  const {
    value: datasets,
    loading,
    error,
  } = useYearResource(years.join(","), null, false, load, null);
  const entities = [
    ...new Set(
      datasets?.flatMap(({ organizations }) =>
        organizations.map(({ entity }) => entity),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const entity = entities.includes(selected) ? selected : (entities[0] ?? "");
  const history = outstandingHistory(datasets ?? [], entity);
  const hasAmounts = history.some(({ rows }) =>
    rows.some(({ outstanding }) => outstanding !== null),
  );

  return (
    <section
      aria-labelledby="ceb-outstanding-trends-title"
      aria-busy={loading}
      className="min-w-0 space-y-3"
    >
      <ChartHeading as="h3" id="ceb-outstanding-trends-title">
        Reported outstanding assessments over time
      </ChartHeading>
      {loading && (
        <p role="status" className="text-sm text-gray-600">
          Loading outstanding assessment trends…
        </p>
      )}
      {error && (
        <p role="status" className="text-sm text-gray-600">
          Outstanding assessment trends could not be loaded.
        </p>
      )}
      {datasets && (
        <>
          <div
            role="group"
            aria-label="Organization for outstanding assessment trends"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-sm text-gray-600">Organization</span>
            <HierarchicalSingleSelect
              groups={entities.map((name) => ({
                id: name,
                label: name,
                children: [],
              }))}
              selected={entity}
              onChange={setSelected}
            />
          </div>
          {hasAmounts ? (
            <CebAssessmentOutstandingPlot history={history} entity={entity} />
          ) : (
            <p role="status" className="text-sm text-gray-600">
              No outstanding assessment amounts reported for {entity}.
            </p>
          )}
          <p className="text-xs leading-relaxed text-gray-600">
            Balances include current and earlier assessment years.
          </p>
        </>
      )}
    </section>
  );
}
