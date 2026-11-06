"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
import { FINANCING_INSTRUMENT_COLORS } from "@/lib/financingInstruments";
import { CebAssessmentTrendsChart } from "@/components/CebAssessmentTrendsChart";
import { PageSourceLink } from "@/components/PageSources";
import { useYearResource } from "@/hooks/useYearResource";
import {
  assessmentEntities,
  CEB_ASSESSMENTS_SECTION,
  loadCebAssessments,
  sumAssessments,
  unknownCurrentAssessments,
  type AssessmentAmount,
} from "@/lib/cebAssessments";
import { formatBudget } from "@/lib/contributors";
import { useYearRanges } from "@/lib/useYearRanges";

function amountLabel(amount: AssessmentAmount) {
  return amount.value === null
    ? "Unknown"
    : formatBudget(amount.value) + (amount.partial ? "*" : "");
}

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
  const selectedRows =
    history?.find((point) => point.year === year)?.rows ?? [];
  const entities = assessmentEntities(selectedRows).sort(
    (a, b) => (b.assessed.value ?? -Infinity) - (a.assessed.value ?? -Infinity),
  );
  const maxAssessment = Math.max(
    1,
    ...entities.map(({ assessed }) => assessed.value ?? 0),
  );
  const visibleEntities = showAllEntities ? entities : entities.slice(0, 10);
  const reported = (history ?? []).map((point) => ({
    year: point.year,
    ...sumAssessments(point.rows),
    unknownCurrent: unknownCurrentAssessments(point.rows),
  }));
  const partialYears = reported
    .filter(
      (point) =>
        point.assessed.partial || point.current.partial || point.prior.partial,
    )
    .map((point) => point.year);
  const totals = sumAssessments(selectedRows);
  const hasHistory = reported.some(
    (point) =>
      point.assessed.value !== null ||
      point.current.value !== null ||
      point.prior.value !== null,
  );

  return (
    <section
      className="space-y-4 border-t border-gray-200 pt-5"
      aria-label="Assessments and payments"
    >
      <FinancialPanelHeading>Assessments and payments</FinancialPanelHeading>
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
                By organization in {year}
              </FinancialPanelHeading>
              <p className="text-xs text-gray-600">
                Bar length shows the assessment. Dark blue shows reported
                payments toward {year}. Hatching marks incomplete figures.
              </p>
              <div className="text-right text-xs font-medium text-gray-600">
                Paid %
              </div>
              {visibleEntities.map(({ entity, assessed, current, prior }) => {
                const amount = Math.max(0, assessed.value ?? 0);
                const barWidth = (amount / maxAssessment) * 100;
                const incomplete = assessed.partial || current.partial;
                const paidPercent =
                  amount > 0 && current.value !== null
                    ? (current.value / amount) * 100
                    : null;
                const paidLabel =
                  !incomplete && paidPercent !== null
                    ? formatAssessmentRate(paidPercent)
                    : null;
                const receiptDetails = [
                  ["Assessed", assessed],
                  [`Paid toward ${year}`, current],
                  ["Paid toward earlier years", prior],
                ] as const;
                return (
                  <div key={entity} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <FinancialPanelRankedRow
                        label={entity}
                        value={amountLabel(assessed)}
                      >
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <div
                              tabIndex={0}
                              className="flex flex-1 cursor-help"
                              aria-label={`${entity}. ${receiptDetails.map(([label, value]) => `${label}: ${amountLabel(value)}`).join(". ")}`}
                            >
                              <div
                                className="flex rounded-sm"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundImage: incomplete
                                    ? "repeating-linear-gradient(135deg, var(--color-gray-100) 0 3px, var(--color-gray-300) 3px 5px)"
                                    : undefined,
                                }}
                              >
                                <FinancialPanelBar
                                  percent={100}
                                  color={
                                    incomplete
                                      ? undefined
                                      : "var(--color-gray-200)"
                                  }
                                  segments={[
                                    {
                                      id: "paid",
                                      percent: Math.max(
                                        0,
                                        Math.min(100, paidPercent ?? 0),
                                      ),
                                      color:
                                        FINANCING_INSTRUMENT_COLORS.assessed,
                                    },
                                  ]}
                                />
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="border border-slate-200 bg-white text-slate-800 shadow-lg"
                          >
                            <p className="mb-1 font-medium">{entity}</p>
                            {receiptDetails.map(([label, value]) => (
                              <div
                                key={label}
                                className="flex justify-between gap-4"
                              >
                                <span>{label}</span>
                                <span className="font-medium">
                                  {amountLabel(value)}
                                </span>
                              </div>
                            ))}
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
              })}
              {!showAllEntities && entities.length > visibleEntities.length && (
                <button
                  type="button"
                  onClick={() => setShowAllEntities(true)}
                  className="text-xs text-gray-600 underline hover:text-gray-900"
                >
                  Show all {entities.length} organizations
                </button>
              )}
              <FinancialPanelTotalRow
                label="Assessments"
                value={amountLabel(totals.assessed)}
              />
              <FinancialPanelTotalRow
                label={`Paid toward ${year}`}
                value={amountLabel(totals.current)}
              />
              <FinancialPanelTotalRow
                label="Paid toward earlier years"
                value={amountLabel(totals.prior)}
              />
              {Object.values(totals).some(({ partial }) => partial) && (
                <p className="text-xs text-gray-600">
                  * Partial amount. The workbook has blank cells.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No assessments workbook data for {year}.
            </p>
          )}
          {hasHistory && (
            <div className="space-y-2">
              <FinancialPanelHeading subheading>
                Payments by year received
              </FinancialPanelHeading>
              <CebAssessmentTrendsChart data={reported} />
              {partialYears.length > 0 && (
                <p className="text-xs text-gray-600">
                  The workbook has blank cells in {partialYears.join(", ")}.
                  Reported totals can be partial. Grey shows assessed amounts
                  with blank current-year receipts.
                </p>
              )}
            </div>
          )}
        </>
      )}
      <p className="text-xs text-gray-600">
        Source: <PageSourceLink source="cebAssessments" />.{" "}
        <Link
          href={`/about/#${CEB_ASSESSMENTS_SECTION}`}
          className="underline underline-offset-2"
        >
          Methodology
        </Link>
      </p>
    </section>
  );
}
