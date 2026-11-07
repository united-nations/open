"use client";

import { useCallback, useState } from "react";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatAssessmentRate } from "@un-eosg/ui/format-budget";
import {
  FinancialPanelBar,
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelTotalRow,
} from "@un-eosg/ui/components/financial-panel-parts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CebAssessmentTrendsChart } from "@/components/CebAssessmentTrendsChart";
import { useYearResource } from "@/hooks/useYearResource";
import {
  assessmentEntities,
  assessmentExclusionNotes,
  CEB_ASSESSMENT_COLORS,
  formatAssessmentAmount,
  loadCebAssessments,
  rowsWithAssessments,
  sumAssessments,
  unknownCurrentAssessments,
} from "@/lib/cebAssessments";
import { formatBudget } from "@/lib/contributors";
import { useYearRanges } from "@/lib/useYearRanges";

const colors = CEB_ASSESSMENT_COLORS;

export function useCebAssessmentHistory(
  id: string | undefined,
  name: string | undefined,
) {
  const { years } = useYearRanges().cebAssessments;
  const load = useCallback(async () => {
    const datasets = await Promise.all(years.map(loadCebAssessments));
    return datasets.map((data) => {
      const contributor = data.contributors.find((contributor) =>
        id
          ? contributor.id === id
          : contributor.name === name ||
            contributor.aliases.some((alias) => alias === name),
      );
      return {
        year: data.year,
        name: contributor?.name,
        aliases: contributor?.aliases,
        rows: contributor?.rows ?? [],
      };
    });
  }, [id, name, years]);
  return useYearResource(id ?? name ?? "", null, !id && !name, load, null);
}

export function CebAssessmentSidebarContent({
  resource: { value: history, loading, error },
  year,
}: {
  resource: ReturnType<typeof useCebAssessmentHistory>;
  year: number;
}) {
  const [showAllEntities, setShowAllEntities] = useState(false);
  const selected = history?.find((point) => point.year === year);
  const selectedRows = rowsWithAssessments(selected?.rows ?? []);
  const exclusions = selected?.name
    ? assessmentExclusionNotes(year, [
        { name: selected.name, rows: selected.rows },
      ])
    : [];
  const entities = assessmentEntities(selectedRows)
    .map((entity) => {
      const currentFill = Math.max(0, entity.current.value ?? 0);
      const priorFill = Math.max(0, entity.prior.value ?? 0);
      return {
        ...entity,
        currentFill,
        priorFill,
        stack: currentFill + entity.unknownCurrent + priorFill,
      };
    })
    .sort((a, b) => (b.assessed.value ?? 0) - (a.assessed.value ?? 0));
  const maxBar = Math.max(
    1,
    ...entities.map(({ assessed, stack }) =>
      Math.max(assessed.value ?? 0, stack),
    ),
  );
  const visibleEntities = showAllEntities ? entities : entities.slice(0, 10);
  const reported = (history ?? []).map((point) => {
    const rows = rowsWithAssessments(point.rows);
    return {
      year: point.year,
      ...sumAssessments(rows),
      unknownCurrent: unknownCurrentAssessments(rows),
    };
  });
  const totals = sumAssessments(selectedRows);
  const unknown = entities.reduce(
    (sum, entity) => sum + entity.unknownCurrent,
    0,
  );
  const hasHistory = reported.some(({ assessed }) => assessed.value !== null);

  return (
    <section
      className="space-y-4 border-t border-gray-200 pt-5"
      aria-label="Assessments and payments"
    >
      <FinancialPanelHeading>Assessments and payments</FinancialPanelHeading>
      {totals.assessed.value !== null && (
        <div className="space-y-2">
          <FinancialPanelTotalRow
            label="Assessments"
            value={formatAssessmentAmount(totals.assessed)}
          />
          <FinancialPanelTotalRow
            label={`Paid toward ${year}`}
            value={formatAssessmentAmount(totals.current)}
          />
          {unknown > 0 && (
            <FinancialPanelTotalRow
              label="Payment status unknown"
              value={formatBudget(unknown)}
            />
          )}
          <FinancialPanelTotalRow
            label="Paid toward earlier years"
            value={formatAssessmentAmount(totals.prior)}
          />
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-gray-600">
          Loading assessments…
        </p>
      )}
      {error && (
        <p role="status" className="text-sm text-gray-600">
          Assessments could not be loaded.
        </p>
      )}
      {history && (
        <>
          {entities.length ? (
            <div className="space-y-2">
              <FinancialPanelHeading subheading>
                By organization
              </FinancialPanelHeading>
              <div className="flex justify-end gap-2 text-right text-xs font-medium text-gray-600">
                <span className="w-16">Assessment</span>
                <span className="w-14">Paid %</span>
              </div>
              {visibleEntities.map(
                ({
                  entity,
                  assessed,
                  current,
                  prior,
                  unknownCurrent,
                  currentFill,
                  priorFill,
                  stack,
                }) => {
                  const amount = assessed.value ?? 0;
                  const assessmentPosition = `${(amount / maxBar) * 100}%`;
                  const paidLabel =
                    amount > 0 && current.value !== null && !current.partial
                      ? formatAssessmentRate((current.value / amount) * 100)
                      : null;
                  const receipts = [
                    {
                      label: `Paid toward ${year}`,
                      value: formatAssessmentAmount(current),
                      amount: currentFill,
                      color: colors.current,
                    },
                    {
                      label: "Payment status unknown",
                      value: formatBudget(unknownCurrent),
                      amount: unknownCurrent,
                      color: colors.unknown,
                    },
                    {
                      label: "Paid toward earlier years",
                      value: formatAssessmentAmount(prior),
                      amount: priorFill,
                      color: colors.prior,
                    },
                  ].filter(
                    ({ label, amount }) =>
                      label !== "Payment status unknown" || amount > 0,
                  );
                  const assessmentLabel = formatAssessmentAmount(assessed);
                  const tooltipRows = [
                    {
                      label: "Assessment",
                      value: assessmentLabel,
                      marker: (
                        <span
                          aria-hidden="true"
                          className="flex w-2 shrink-0 justify-center"
                        >
                          <span
                            className="h-3 w-0.5 rounded-full"
                            style={{ backgroundColor: colors.assessed }}
                          />
                        </span>
                      ),
                    },
                    ...receipts,
                  ];
                  return (
                    <div key={entity} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <FinancialPanelRankedRow
                          label={entity}
                          value={assessmentLabel}
                        >
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div
                                tabIndex={0}
                                className="relative isolate flex min-w-0 flex-1 cursor-help"
                                aria-label={`${entity}. ${tooltipRows.map(({ label, value }) => `${label}: ${value}`).join(". ")}`}
                              >
                                {amount > 0 && (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-1/2 left-0 -z-10 h-px -translate-y-1/2 bg-gray-300"
                                    style={{ width: assessmentPosition }}
                                  />
                                )}
                                <FinancialPanelBar
                                  percent={(stack / maxBar) * 100}
                                  segments={receipts.map(
                                    ({ label, amount, color }) => ({
                                      id: label,
                                      percent:
                                        stack > 0 ? (amount / stack) * 100 : 0,
                                      color,
                                    }),
                                  )}
                                />
                                {amount >= 0 && (
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                    style={{
                                      left: assessmentPosition,
                                      backgroundColor: colors.assessed,
                                    }}
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="border border-slate-200 bg-white text-slate-800 shadow-lg"
                            >
                              <FinancialTooltip
                                title={entity}
                                rows={tooltipRows}
                              />
                            </TooltipContent>
                          </Tooltip>
                        </FinancialPanelRankedRow>
                      </div>
                      <span className="w-14 shrink-0 text-right text-xs text-gray-600 tabular-nums">
                        {paidLabel ?? (
                          <>
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">
                              Payment percentage unavailable
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  );
                },
              )}
              {!showAllEntities && entities.length > visibleEntities.length && (
                <button
                  type="button"
                  onClick={() => setShowAllEntities(true)}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Show all {entities.length} organizations
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No assessment data for {year}.
            </p>
          )}
          {hasHistory && (
            <div className="space-y-2">
              <FinancialPanelHeading subheading>
                Payments by year received
              </FinancialPanelHeading>
              <CebAssessmentTrendsChart data={reported} />
            </div>
          )}
          {exclusions.map((note) => (
            <p key={note} className="text-xs text-gray-600">
              {note}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
