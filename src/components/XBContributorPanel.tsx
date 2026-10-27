"use client";

import { useEffect, useState } from "react";
import { YearSlider } from "@/components/YearSlider";
import { ChartFooter } from "@/components/ChartFooter";
import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelSection,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { SidebarControls } from "@/components/SidebarControls";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { loadStaticData } from "@/lib/data";
import { formatBudget } from "@un-eosg/ui/format-budget";
import type {
  XBContributorsData,
  XBContributorRow,
  XBContributorSeries,
  BudgetNodeSource,
} from "@/types";

const UNODC_MEASURE_NOTE =
  "Pledged contributions, rather than money received or spent.";

export function ContributorSourceReferences({
  series,
  row,
  collapsible = true,
}: {
  series: XBContributorSeries;
  row?: XBContributorRow;
  collapsible?: boolean;
}) {
  const seen = new Set<string>();
  const references: BudgetNodeSource[] =
    series.entity === "UNODC"
      ? (row?.sources ?? series.sources)
          .filter((source) => {
            const key = `${source.url}:${source.pdfPage ?? ""}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((source) => ({
            ...source,
            rowLabel: row?.name ?? "UNODC overall pledged contributions",
            columnHeader: String(series.year),
            tableTitle: source.pdfPage ? source.tableTitle : undefined,
          }))
      : (row?.sources ?? series.sources);
  const content = (
    <div className="mt-3 space-y-2 text-sm text-gray-600">
      {!row && series.reportedTotal !== null && (
        <p>Reported source total: {formatBudget(series.reportedTotal)}.</p>
      )}
      {!row && !!series.difference && (
        <p>Unallocated source difference: {formatBudget(series.difference)}.</p>
      )}
      {series.notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
      {!row &&
        series.otherCategories
          .filter((category) => category.amount !== 0)
          .map((category) => (
            <div key={category.name}>
              <p>
                {category.name}: {formatBudget(category.amount)}
                {series.entity === "ITC" && category.name === "Revolving funds"
                  ? " (a funding category, not a named contributor)."
                  : "."}
              </p>
              <SourceReferenceLinks references={category.sources} />
            </div>
          ))}
      <SourceReferenceList references={references} />
    </div>
  );
  return collapsible ? (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium">
        Source references
      </summary>
      {content}
    </details>
  ) : (
    content
  );
}

function measureNote(series: XBContributorSeries): string {
  if (series.entity === "UNODC") return UNODC_MEASURE_NOTE;
  if (series.entity === "UN-HABITAT")
    return "Provisional contributions and transfers covering only part of UN-Habitat’s funding.";
  return "Reported funding received; not directly comparable with the other sources.";
}

function ContributorDetails({ row }: { row: XBContributorRow }) {
  return (
    <div className="space-y-3 text-sm">
      {row.grouped && (
        <p>
          This is a grouped counterparty as reported by the source; its members
          are not individually identified.
        </p>
      )}
      {row.needsReview && (
        <p>
          The contributor label is retained as printed and requires identity
          review.
        </p>
      )}
      {row.sources.some((source) => !source.pdfPage) && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Source references
          </summary>
          <div className="mt-3">
            <SourceReferenceList
              references={row.sources.filter((source) => !source.pdfPage)}
            />
          </div>
        </details>
      )}
      {row.components.map((component) => (
        <div key={component.id}>
          <p className="flex justify-between gap-4">
            <span>{component.label}</span>
            <span>{formatBudget(component.amount)}</span>
          </p>
          <SourceReferenceLinks references={component.sources} />
        </div>
      ))}
    </div>
  );
}

function ContributorDialog({
  row,
  series,
  onClose,
}: {
  row: XBContributorRow;
  series: XBContributorSeries;
  onClose: () => void;
}) {
  const ref = useFocusTrap(true);
  useEffect(() => {
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => {
      document.documentElement.style.overflow = overflow;
      document.removeEventListener("keydown", close);
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="xb-contributor-title"
        className="h-full w-full bg-white shadow-2xl sm:w-[32rem]"
      >
        <FinancialDetailPanel
          title={row.name}
          titleId="xb-contributor-title"
          subtitle={`${series.entity} · ${series.scopeLabel} · ${series.year}`}
          controls={
            <SidebarControls
              onClose={onClose}
              closeLabel="Close contributor details"
            />
          }
          total={{ label: series.measure, value: formatBudget(row.amount) }}
        >
          <p className="mb-3 text-sm">{measureNote(series)}</p>
          {series.entity === "UNODC" ? (
            row.grouped && (
              <p className="mb-3 text-sm">
                This is a grouped counterparty as reported by the source.
              </p>
            )
          ) : (
            <FinancialPanelSection heading="Reported destinations">
              <ContributorDetails row={row} />
            </FinancialPanelSection>
          )}
          <ContributorSourceReferences series={series} row={row} />
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}

/** Source-specific donor measures, with partial coverage visible before amounts. */
export function XBContributorPanel({
  entity,
  year,
  scope = "entity",
  compact = false,
  onSourceSeriesChange,
  onYearChange,
  yearOptions,
}: {
  entity: string;
  year: number;
  scope?: string;
  compact?: boolean;
  onSourceSeriesChange?: (series: XBContributorSeries | null) => void;
  onYearChange?: (year: number) => void;
  yearOptions?: number[];
}) {
  const [data, setData] = useState<XBContributorsData | null>(null);
  const [error, setError] = useState(false);
  const [yearOverride, setYearOverride] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadStaticData<XBContributorsData>("secretariat-xb-contributors.json")
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const isUNODC = entity === "UNODC";
  const records =
    data?.series.filter(
      (series) =>
        series.entity === entity && (!isUNODC || series.scope === "entity"),
    ) ?? [];
  const selectedYear = compact || onYearChange ? year : (yearOverride ?? year);
  const years =
    yearOptions ??
    [...new Set([year, ...records.map((series) => series.year)])].sort();
  const effectiveScope = isUNODC || !compact ? "entity" : scope;
  const series = records.find(
    (item) => item.year === selectedYear && item.scope === effectiveScope,
  );
  useEffect(() => {
    onSourceSeriesChange?.(series ?? null);
  }, [onSourceSeriesChange, series]);
  const rows =
    series?.rows.filter(
      (row) =>
        row.amount !== 0 &&
        row.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ) ?? [];
  const maximum = Math.max(0, ...rows.map((row) => row.amount));
  const chosen = rows.find((row) => row.name === selected);
  const changeYear = (value: number) => {
    if (onYearChange) onYearChange(value);
    else setYearOverride(value);
    setSelected(null);
  };
  if (!data)
    return (
      <p role="status" className="text-sm text-gray-500">
        {error
          ? "Contributor data could not be loaded."
          : "Loading contributor data…"}
      </p>
    );
  return (
    <div className="space-y-3" data-xb-contributor-panel={entity}>
      {!series ? (
        compact ? (
          <p className="text-sm text-gray-600">
            No contributor breakdown is available for this{" "}
            {scope === "entity" ? "entity" : "account or fund group"} in{" "}
            {selectedYear}.
          </p>
        ) : (
          <GroupedTreemap<never, never, XBContributorRow, never>
            totalLabel="Listed amounts"
            rows={[]}
            summaries={[
              {
                key: "unavailable",
                label: "Contributor data",
                value: "Not available",
              },
            ]}
            footer={
              <ChartFooter
                hint="Select a reporting source and year to explore contributors"
                details={
                  <p>
                    No contributor breakdown is available for this entity in{" "}
                    {selectedYear}.
                  </p>
                }
              />
            }
            search={{
              value: query,
              onChange: setQuery,
              label: "Search contributors",
              placeholder: "Search contributors...",
            }}
            yearControl={
              <YearSlider
                years={years}
                selectedYear={selectedYear}
                onChange={changeYear}
              />
            }
            plotClassName="h-[560px] sm:h-[680px] lg:h-[780px]"
            emptyContent={
              <p className="text-sm text-gray-600">
                No contributor breakdown is available for this{" "}
                {scope === "entity" ? "entity" : "account or fund group"} in{" "}
                {selectedYear}.
              </p>
            }
          />
        )
      ) : (
        <>
          <p className="text-sm text-gray-600">{measureNote(series)}</p>
          {compact ? (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>
                    {isUNODC
                      ? "Total pledged contributions"
                      : "Listed contributor amounts"}
                  </dt>
                  <dd>{formatBudget(series.contributorTotal)}</dd>
                </div>
              </dl>
              <div className="space-y-2">
                {(showAll ? rows : rows.slice(0, 10)).map((row) => {
                  const rankedRow = (
                    <FinancialPanelRankedRow
                      label={`${row.name}${row.needsReview ? " (source label under review)" : ""}`}
                      value={formatBudget(row.amount)}
                    >
                      <FinancialPanelBar
                        percent={
                          maximum > 0
                            ? Math.max(0, (row.amount / maximum) * 100)
                            : 0
                        }
                        color="var(--color-un-blue)"
                      />
                    </FinancialPanelRankedRow>
                  );
                  return isUNODC ? (
                    <div key={row.name}>{rankedRow}</div>
                  ) : (
                    <details key={row.name} className="group/xb-donor">
                      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        {rankedRow}
                      </summary>
                      <div className="mt-2 border-l border-gray-200 ps-3">
                        <ContributorDetails row={row} />
                      </div>
                    </details>
                  );
                })}
              </div>
              {rows.length > 10 && (
                <button
                  type="button"
                  className="text-sm text-un-blue underline"
                  onClick={() => setShowAll((value) => !value)}
                >
                  {showAll
                    ? "Show fewer contributors"
                    : `Show all ${rows.length} reported contributors`}
                </button>
              )}
            </>
          ) : (
            <GroupedTreemap<never, never, XBContributorRow, never>
              yearControl={
                <YearSlider
                  years={years}
                  selectedYear={selectedYear}
                  onChange={changeYear}
                />
              }
              footer={
                <ChartFooter
                  hint="Click on a contributor to explore details"
                  signedAmounts={rows.map((row) => ({
                    label: row.name,
                    amount: row.amount,
                  }))}
                  details={
                    <ContributorSourceReferences
                      series={series}
                      collapsible={false}
                    />
                  }
                />
              }
              totalLabel="Listed amounts"
              showRowLabels={false}
              showLeafValues
              plotClassName="h-[560px] sm:h-[680px] lg:h-[780px]"
              formatValue={formatBudget}
              search={{
                value: query,
                onChange: setQuery,
                label: "Search contributors",
                placeholder: "Search contributors...",
              }}
              rows={[
                {
                  key: "contributors",
                  label: series.scopeLabel,
                  leaves: rows
                    .filter((row) => row.amount > 0)
                    .map((row) => ({
                      key: row.name,
                      label: row.name,
                      value: row.amount,
                      color: "var(--color-un-blue)",
                      data: row,
                      onActivate: () => setSelected(row.name),
                    })),
                },
              ]}
              summaries={[
                {
                  key: "listed",
                  label: query
                    ? "Matching contributor amounts"
                    : isUNODC
                      ? "Total pledged contributions"
                      : "Listed contributor amounts",
                  value: formatBudget(
                    rows.reduce((total, row) => total + row.amount, 0),
                  ),
                },
              ]}
              renderTooltip={({ leaf }) => (
                <FinancialTooltip
                  title={leaf.label}
                  total={{
                    label: series.measure,
                    value: formatBudget(leaf.value),
                  }}
                  actionHint={
                    isUNODC
                      ? "Select for contributor details and sources"
                      : "Select to see reported destinations and source pages"
                  }
                />
              )}
              interactiveTooltip
              emptyContent={
                <p className="p-4 text-sm text-gray-500">
                  No positive contributor amounts match the search.
                </p>
              }
            />
          )}
          {!compact && rows.some((row) => row.amount < 0) && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Negative reported amounts
              </summary>
              <p className="my-2 text-sm text-gray-600">
                Negative amounts reduce the total but cannot be shown as treemap
                tiles.
              </p>
              <div className="space-y-2">
                {rows
                  .filter((row) => row.amount < 0)
                  .map((row) => (
                    <button
                      type="button"
                      key={row.name}
                      className="flex w-full justify-between gap-4 text-left text-sm text-un-blue"
                      onClick={() => setSelected(row.name)}
                    >
                      <span>{row.name}</span>
                      <span>{formatBudget(row.amount)}</span>
                    </button>
                  ))}
              </div>
            </details>
          )}
          {compact && !onSourceSeriesChange && (
            <ContributorSourceReferences series={series} />
          )}
          {!compact && chosen && (
            <ContributorDialog
              row={chosen}
              series={series}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
