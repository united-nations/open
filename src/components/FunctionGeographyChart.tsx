"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartSourceProvider } from "@/components/ChartSource";
import { CebMethodology } from "@/components/Methodology";
import { YearSlider } from "@/components/YearSlider";
import { useYearResource } from "@/hooks/useYearResource";
import { useYearRanges } from "@/lib/useYearRanges";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import {
  FUNCTION_GEOGRAPHY_LEVELS,
  functionGeographyColumns,
  type FunctionGeographyData,
} from "@/lib/functionGeography";

const percent = (share: number | null) =>
  share === null ? "Unavailable" : `${(share * 100).toFixed(1)}%`;

export function FunctionGeographyChart() {
  const years = useYearRanges().functionGeography;
  const [year, setYear] = useState(years.default);
  const [retry, setRetry] = useState(0);
  const load = useCallback(
    () => loadYearData<FunctionGeographyData>("function-geography", year),
    [year],
  );
  const {
    value: data,
    loading,
    error,
  } = useYearResource<FunctionGeographyData | null>(
    `${year}-${retry}`,
    null,
    false,
    load,
    null,
  );
  const columns = data ? functionGeographyColumns(data) : [];
  const hasNegativeCells = columns.some((column) =>
    column.cells.some((cell) => cell.amount < 0),
  );
  return (
    <section id="function-geography" className="mt-12 scroll-mt-28 space-y-4">
      <h2 className="text-2xl font-bold">
        Expenditure by function and geographic level
      </h2>
      <p className="max-w-3xl text-sm text-gray-600">
        Column widths show each function’s share of reported expenditure. Within
        each column, the stacked areas show where that expenditure is reported.
      </p>
      {data && !data.meta.functionAttributionComplete && (
        <p role="note" className="text-sm text-gray-600">
          Function attribution is incomplete for {year}.{" "}
          {formatBudget(data.meta.unreportedFunctionAmount)} remains under
          “Function not reported”; no function is inferred from separate totals.
        </p>
      )}
      <ChartSourceProvider
        label="CEB financial statistics — function and geographic location"
        details={<CebMethodology />}
      >
        <ChartFrame
          header={
            <ChartHeader
              yearControl={
                <YearSlider
                  years={years.years}
                  selectedYear={year}
                  onChange={setYear}
                />
              }
              summaries={[
                {
                  key: "total",
                  label: "Total expenditure",
                  value: data
                    ? formatBudget(data.total)
                    : error
                      ? "Unavailable"
                      : "Loading…",
                },
              ]}
            />
          }
          footer={
            <ChartFooter
              hint="Hover or focus a segment for amounts and shares."
              details={
                <div className="space-y-3">
                  <p>
                    This chart uses the function and location recorded together
                    on CEB geographic expenditure records (E06). Overlapping
                    E06A/B/C components are excluded. Regional and subregional
                    records are combined; global amounts remain unallocated to
                    countries. Negative source amounts remain in the net totals.
                  </p>
                  <p>
                    Function attribution is complete from 2020 and follows CEB
                    Standard II. Reporting coverage can change between years.
                    These geographic amounts can differ from separately reported
                    function totals.
                  </p>
                  {data && (
                    <>
                      <a
                        href={data.meta.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Download the CEB geographic source data
                      </a>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <caption className="mb-2 text-left font-semibold">
                            Reported expenditure · {data.meta.year}
                          </caption>
                          <thead>
                            <tr>
                              <th className="p-2 text-left">Function</th>
                              {FUNCTION_GEOGRAPHY_LEVELS.map((level) => (
                                <th key={level.key} className="p-2 text-right">
                                  {level.label}
                                </th>
                              ))}
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {columns.map((column) => (
                              <tr key={column.key} className="border-t">
                                <th className="p-2 text-left font-medium">
                                  {column.label}
                                </th>
                                {column.cells.map((cell) => (
                                  <td
                                    key={cell.level}
                                    className="p-2 text-right tabular-nums"
                                  >
                                    {formatBudget(cell.amount)}
                                  </td>
                                ))}
                                <td className="p-2 text-right tabular-nums">
                                  {formatBudget(column.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              }
            />
          }
        >
          <div
            className="mb-4 flex flex-wrap gap-x-5 gap-y-1"
            aria-label="Geographic levels"
          >
            {FUNCTION_GEOGRAPHY_LEVELS.map((level) => (
              <LegendLabel
                key={level.key}
                label={level.label}
                color={level.color}
                variant="inline"
              />
            ))}
          </div>
          {loading ? (
            <div
              role="status"
              className="flex min-h-96 items-center justify-center text-sm text-gray-600"
            >
              Loading function and geographic expenditure…
            </div>
          ) : error ? (
            <div role="alert" className="py-12 text-sm">
              The chart could not be loaded.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {hasNegativeCells && (
                <p className="mb-3 text-sm">
                  Areas show positive cell totals only. Negative cell totals
                  remain in the reported total and source table.
                </p>
              )}
              <div className="overflow-x-auto pb-2">
                <div
                  className="flex min-w-[720px] gap-2"
                  role="group"
                  aria-label={`Expenditure by function and geographic level in ${year}`}
                >
                  {columns
                    .filter((column) => column.area > 0)
                    .map((column) => (
                      <div
                        key={column.key}
                        className="min-w-0"
                        style={{ flexGrow: column.area, flexBasis: 0 }}
                        data-function={column.key}
                      >
                        <div className="h-28 border-l border-gray-200 pl-2">
                          <h3 className="text-sm leading-5 font-semibold">
                            {column.key === "unreported" ? (
                              column.label
                            ) : (
                              <Link
                                href={`/system/functions/?year=${year}#function=${column.key}`}
                                className="hover:text-un-blue hover:underline"
                              >
                                {column.label}
                              </Link>
                            )}
                          </h3>
                          <p className="mt-1 text-sm tabular-nums">
                            {percent(column.share)} of total
                          </p>
                          <p className="text-xs text-gray-600 tabular-nums">
                            {formatBudget(column.total)}
                          </p>
                        </div>
                        <div className="relative h-80">
                          {column.cells
                            .filter((cell) => cell.height > 0)
                            .map((cell) => (
                              <Tooltip key={cell.level} delayDuration={80}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    data-level={cell.level}
                                    data-amount={cell.amount}
                                    data-share={cell.share}
                                    aria-label={`${column.label}, ${cell.label}: ${formatBudget(cell.amount)}, ${percent(cell.share)} of function expenditure`}
                                    className="absolute left-0 w-full overflow-hidden text-white shadow-[inset_0_0_0_1px_white] hover:brightness-110 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    style={{
                                      top: `${cell.top * 100}%`,
                                      height: `${cell.height * 100}%`,
                                      backgroundColor: cell.color,
                                      color: cell.textColor,
                                    }}
                                  >
                                    {cell.height >= 0.09 &&
                                      column.width >= 0.08 && (
                                        <span className="text-sm font-semibold tabular-nums">
                                          {percent(cell.share)}
                                        </span>
                                      )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-sm border bg-white p-3 shadow-lg"
                                >
                                  <FinancialTooltip
                                    title={cell.label}
                                    parents={[{ label: column.label }]}
                                    total={{
                                      label: "Expenditure",
                                      value: formatBudget(cell.amount),
                                    }}
                                    rows={[
                                      {
                                        label: "Share of function",
                                        value: percent(cell.share),
                                      },
                                      {
                                        label:
                                          "Share of all geographic expenditure",
                                        value: percent(
                                          data && data.total > 0
                                            ? cell.amount / data.total
                                            : null,
                                        ),
                                      },
                                      ...(cell.negativeAdjustments < 0
                                        ? [
                                            {
                                              label:
                                                "Negative source amounts included",
                                              value: formatBudget(
                                                cell.negativeAdjustments,
                                              ),
                                            },
                                          ]
                                        : []),
                                    ]}
                                  />
                                </TooltipContent>
                              </Tooltip>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </ChartFrame>
      </ChartSourceProvider>
    </section>
  );
}
