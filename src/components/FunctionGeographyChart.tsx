"use client";
import { formatPercent } from "@un-eosg/ui/format-budget";
import { ChartHeading, SubsectionHeading } from "@/components/ContentHeading";

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
  share === null ? "Unavailable" : formatPercent(share * 100);

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
  return (
    <section id="function-geography" className="mt-12 scroll-mt-40 space-y-3">
      <ChartHeading>Expenditure by function and geographic level</ChartHeading>
      <p className="hidden max-w-3xl text-sm text-gray-600 lg:block">
        Column widths show each function’s share of reported expenditure. Within
        each column, the stacked areas show where that expenditure is reported.
      </p>

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
            <div
              className="space-y-4 lg:hidden"
              aria-label="Expenditure by function and geographic level"
            >
              {columns.map((column) => (
                <section key={column.key} className="rounded-sm border p-3">
                  <SubsectionHeading>
                    {column.key === "unreported" ? (
                      column.label
                    ) : (
                      <Link
                        href={`/system/functions/?year=${year}#function=${column.key}`}
                        className="inline-flex min-h-11 items-center underline underline-offset-2"
                      >
                        {column.label}
                      </Link>
                    )}
                  </SubsectionHeading>
                  <p className="mb-2 text-sm text-gray-600">
                    {formatBudget(column.total)} · {percent(column.share)} of
                    total
                  </p>
                  <dl className="divide-y">
                    {column.cells.map((cell) => (
                      <div
                        key={cell.level}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-2 text-sm"
                      >
                        <dt className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: cell.color }}
                            aria-hidden
                          />
                          {cell.label}
                        </dt>
                        <dd className="text-right tabular-nums">
                          <span className="block font-medium">
                            {formatBudget(cell.amount)}
                          </span>
                          <span className="block text-xs text-gray-600">
                            {percent(cell.share)} of function
                          </span>
                          <span className="block text-xs text-gray-600">
                            {percent(
                              data && data.total > 0
                                ? cell.amount / data.total
                                : null,
                            )}{" "}
                            of total
                          </span>
                        </dd>
                        {cell.negativeAdjustments < 0 && (
                          <dd className="col-span-2 text-xs text-gray-600">
                            Includes {formatBudget(cell.negativeAdjustments)} in
                            negative source amounts
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <div className="hidden overflow-x-auto pb-2 lg:block">
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
    </section>
  );
}
