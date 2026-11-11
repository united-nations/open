"use client";
import { ChartHeading } from "@/components/ContentHeading";

import { useCallback, useState } from "react";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatAssessmentRate } from "@un-eosg/ui/format-budget";
import { YearSlider } from "@/components/YearSlider";
import { CebAssessmentOutstandingNotes } from "@/components/CebAssessmentOutstandingNotes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { useYearResource } from "@/hooks/useYearResource";
import {
  loadCebAssessmentOutstanding,
  outstandingDate,
  outstandingRows,
  outstandingSourceUrl,
  annualAssessmentReferences,
  outstandingAssessmentPercent,
} from "@/lib/cebAssessmentOutstanding";
import { loadCebAssessments } from "@/lib/cebAssessments";
import { formatBudget } from "@/lib/contributors";
import { OUTSTANDING_TOTAL_COLOR } from "@/lib/regularBudgetOutstanding";
import { useYearRanges } from "@/lib/useYearRanges";

export function CebAssessmentOutstandingChart() {
  const { years, default: latest } = useYearRanges().cebAssessmentOutstanding;
  const [year, setYear] = useState(latest);
  const [showAll, setShowAll] = useState(false);
  const load = useCallback(async () => {
    const [outstanding, assessments] = await Promise.all([
      loadCebAssessmentOutstanding(year),
      loadCebAssessments(year).catch(() => null),
    ]);
    return {
      outstanding,
      annual: assessments
        ? annualAssessmentReferences(assessments)
        : new Map<string, { amount: number | null; complete: boolean }>(),
    };
  }, [year]);
  const {
    value: loaded,
    loading,
    error,
  } = useYearResource(String(year), null, false, load, null);
  const data = loaded?.outstanding;
  const rows = data
    ? outstandingRows(data).sort((a, b) =>
        a.outstanding === null
          ? b.outstanding === null
            ? a.label.localeCompare(b.label)
            : 1
          : b.outstanding === null
            ? -1
            : b.outstanding - a.outstanding,
      )
    : [];
  const min = Math.min(0, ...rows.map(({ outstanding }) => outstanding ?? 0));
  const max = Math.max(0, ...rows.map(({ outstanding }) => outstanding ?? 0));
  const span = max - min || 1;
  const zero = (-min / span) * 100;
  const visible = showAll ? rows : rows.slice(0, 10);
  return (
    <section
      aria-labelledby="ceb-outstanding-title"
      className="min-w-0 space-y-3"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChartHeading as="h3" id="ceb-outstanding-title">
          Reported outstanding assessments
        </ChartHeading>
        <YearSlider
          years={years}
          selectedYear={year}
          onChange={(next) => {
            setYear(next);
            setShowAll(false);
          }}
        />
      </div>
      {loading && (
        <p role="status" className="text-sm text-gray-600">
          Loading outstanding assessments…
        </p>
      )}
      {error && (
        <p role="status" className="text-sm text-gray-600">
          Outstanding assessments could not be loaded.
        </p>
      )}
      {data && (
        <>
          <ol
            className="space-y-2"
            aria-label={`Reported outstanding balances in ${year}`}
          >
            <li
              aria-hidden="true"
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_4rem] items-end gap-2 text-right text-[11px] leading-tight text-gray-600 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_4.5rem_4rem]"
            >
              <span className="sm:col-span-2" />
              <span>Outstanding</span>
              <span>% of annual assessment</span>
            </li>
            {visible.map((record) => {
              const position = (((record.outstanding ?? 0) - min) / span) * 100;
              const value =
                record.outstanding === null
                  ? "Unavailable"
                  : formatBudget(record.outstanding);
              const annual = loaded?.annual.get(record.entity);
              const relative = outstandingAssessmentPercent(
                record.outstanding,
                annual,
              );
              const percent =
                relative === null
                  ? "Unavailable"
                  : formatAssessmentRate(relative);
              return (
                <li key={record.key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          navigateToSidebar(
                            "entity",
                            `${record.entity}@${year}@outstanding`,
                          )
                        }
                        className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_4.5rem_4rem] items-center gap-2 rounded-sm text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-un-blue sm:min-h-0 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_4.5rem_4rem]"
                        aria-label={`${record.label}: ${value}. ${percent} of annual assessments. ${outstandingDate(record)}. Open organization details`}
                      >
                        <span className="min-w-0 text-sm font-medium break-words sm:truncate sm:text-xs">
                          {record.label}
                        </span>
                        <span
                          className="relative hidden h-2 sm:block"
                          aria-hidden="true"
                        >
                          {min < 0 && (
                            <span
                              className="absolute inset-y-0 w-px bg-gray-300"
                              style={{ left: `${zero}%` }}
                            />
                          )}
                          {record.outstanding !== null && (
                            <span
                              className="absolute inset-y-0 rounded-sm"
                              style={{
                                left: `${Math.min(zero, position)}%`,
                                width: `${Math.abs(position - zero)}%`,
                                minWidth:
                                  record.outstanding === 0 ? 1 : undefined,
                                backgroundColor: OUTSTANDING_TOTAL_COLOR,
                              }}
                            />
                          )}
                        </span>
                        <span className="text-right text-xs text-gray-600 tabular-nums">
                          {value}
                        </span>
                        <span className="text-right text-xs text-gray-600 tabular-nums">
                          {relative === null ? (
                            <>
                              <span aria-hidden="true">—</span>
                              <span className="sr-only">
                                Annual assessment comparison unavailable
                              </span>
                            </>
                          ) : (
                            percent
                          )}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm border border-gray-200 bg-white text-gray-900 shadow-lg">
                      <FinancialTooltip
                        title={record.label}
                        rows={[
                          {
                            label: "Reported outstanding",
                            value,
                            color: OUTSTANDING_TOTAL_COLOR,
                          },
                          { label: "As at", value: outstandingDate(record) },
                          {
                            label: `Annual assessments (${year})`,
                            value:
                              annual?.amount !== null &&
                              annual?.amount !== undefined
                                ? formatBudget(annual.amount) +
                                  (annual.complete ? "" : " (incomplete)")
                                : "Unavailable",
                          },
                          {
                            label: "Balance / annual assessments",
                            value: percent,
                          },
                        ]}
                      />
                      <a
                        className="mt-2 block text-xs underline"
                        href={outstandingSourceUrl(data, record)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {data.source.symbol}, Table {data.source.table}
                      </a>
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ol>
          {!showAll && rows.length > visible.length && (
            <button
              type="button"
              className="text-xs text-gray-600 underline"
              onClick={() => setShowAll(true)}
            >
              Show all {rows.length} reported balances
            </button>
          )}
          <CebAssessmentOutstandingNotes data={data} />
        </>
      )}
    </section>
  );
}
