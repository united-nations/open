"use client";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFooter } from "@/components/ChartFooter";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TrustFundContributorSidebar } from "@/components/TrustFundContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  TrustFundContributor,
  TrustFundContributorsData,
  TrustFundFlow,
} from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type ContributorGroup = TrustFundFlow["group"];
type ContributorTile = {
  contributor: TrustFundContributor;
  flow: TrustFundFlow;
};

const GROUP_STYLES: Record<
  ContributorGroup,
  { label: string; color: string; textColor: string }
> = {
  governments: {
    label: "Government",
    color: "#009edb",
    textColor: "#ffffff",
  },
  other: {
    label: "Others",
    color: "#047857",
    textColor: "#ffffff",
  },
  inter_organizational: {
    label: "Inter-organizational arrangements",
    color: "#4b7f82",
    textColor: "#ffffff",
  },
  internal: {
    label: "Internal transfers",
    color: "#806491",
    textColor: "#ffffff",
  },
};

const currency = sharedFormatBudget;

function matchesQuery(name: string, query: string): boolean {
  return name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function ContributorTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<
    ContributorGroup,
    string,
    ContributorTile,
    never
  >;
}) {
  const tile = context.leaf.data;
  if (!tile) return null;
  const { contributor, flow } = tile;
  return (
    <FinancialTooltip
      title={contributor.name}
      parents={[{ label: context.row.label, color: context.row.color }]}
      total={{
        label: "Net amount in this category",
        value: currency(flow.amount_usd),
      }}
      notes={
        <>
          <p>
            The sidebar combines this contributor’s funding across all
            categories.
          </p>
          <SourceReferenceLinks references={flow.supportingSources ?? []} />
        </>
      }
      actionHint="Click to explore details"
    />
  );
}

export function TrustFundContributorsTreemap() {
  const years = useYearRanges().trustFundContributors;
  const [year, setYear] = useState(years.default);
  const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<TrustFundContributorsData | null>(null);
  const [loadError, setLoadError] = useState<{
    year: number;
    message: string;
  } | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "trust-fund-contributor",
    sectionId: "trust-fund-contributors",
    onNavigateAway: () => setSelectedName(null),
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/data/trust-fund-contributors-${year}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${year} data`);
        return response.json() as Promise<TrustFundContributorsData>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setLoadError({
          year,
          message:
            reason instanceof Error ? reason.message : "Failed to load data",
        });
      });
    return () => controller.abort();
  }, [year]);

  const current = data;
  const error = loadError?.year === year ? loadError.message : null;
  const selected = current?.contributors.find(
    (contributor) => contributor.name === selectedName,
  );

  useEffect(() => {
    if (!pending || !current) return;
    const id = window.setTimeout(() => {
      const match = current.contributors.find(
        (contributor) => contributor.name === pending,
      );
      if (match) setSelectedName(match.name);
      setPending(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [current, pending, setPending]);

  const open = useCallback((contributor: TrustFundContributor) => {
    setSelectedName(contributor.name);
    replaceToSidebar("trust-fund-contributor", contributor.name);
  }, []);
  const tiles = useMemo(
    () =>
      (current?.contributors ?? []).flatMap((contributor) =>
        (contributor.flows ?? []).map((flow) => ({ contributor, flow })),
      ),
    [current],
  );
  const rows = useMemo(() => {
    const result = (Object.keys(GROUP_STYLES) as ContributorGroup[]).map(
      (key) => {
        const members = tiles
          .filter((tile) => tile.flow.group === key && tile.flow.amount_usd > 0)
          .sort(
            (a, b) =>
              b.flow.amount_usd - a.flow.amount_usd ||
              a.contributor.name.localeCompare(b.contributor.name),
          );
        return {
          key,
          label: GROUP_STYLES[key].label,
          color: GROUP_STYLES[key].color,
          data: key,
          subgroups: members.map(({ contributor, flow }) => ({
            key: `${key}:${contributor.name}`,
            label: contributor.name,
            labelVisibility: "tooltip-only" as const,
            data: contributor.name,
            leaves: [
              {
                key: `${key}:${contributor.name}`,
                label: contributor.name,
                value: flow.amount_usd,
                color: GROUP_STYLES[key].color,
                textColor: GROUP_STYLES[key].textColor,
                data: { contributor, flow },
                onActivate: () => open(contributor),
              },
            ],
          })),
        } satisfies GroupedTreemapRow<
          ContributorGroup,
          string,
          ContributorTile,
          never
        >;
      },
    );
    return result
      .filter((row) => row.subgroups.length > 0)
      .sort(
        (a, b) =>
          b.subgroups.reduce((sum, group) => sum + group.leaves[0].value, 0) -
          a.subgroups.reduce((sum, group) => sum + group.leaves[0].value, 0),
      );
  }, [open, tiles]);
  const visibleTotal = rows
    .filter((row) => !hiddenGroups.includes(row.key))
    .flatMap((row) => row.subgroups.flatMap((group) => group.leaves))
    .filter((leaf) => matchesQuery(leaf.label, query))
    .reduce((sum, leaf) => sum + leaf.value, 0);
  const nonPositiveCount = tiles.filter(
    (tile) => tile.flow.amount_usd <= 0,
  ).length;

  return (
    <div className="relative w-full">
      <DelayedChartLoading
        pending={data?.meta.year !== year}
        requestKey={year}
      />
      {current && (
        <>
          <GroupedTreemap<ContributorGroup, string, ContributorTile, never>
            footer={
              <ChartFooter
                details={
                  <div className="space-y-2">
                    <p>
                      <a
                        href={current.meta.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-un-blue underline"
                      >
                        {current.meta.source.symbol}
                      </a>
                    </p>
                    <p>
                      Tile area is the signed net of named contribution and
                      transfer rows; click a contributor to see its funds and
                      reconstructed entity destinations.
                      {nonPositiveCount > 0 &&
                        ` ${nonPositiveCount} contributor-category amounts with a zero or negative annual net are retained in the data but cannot be drawn as areas.`}
                    </p>
                    <p>
                      Reconciliation compares extracted rows with reported
                      totals for each fund and flow type. The match is{" "}
                      {(current.meta.named_row_completeness * 100).toFixed(2)}%,
                      calculated as 100% minus the sum of absolute differences
                      divided by the sum of absolute reported totals. Unresolved
                      differences may reflect extraction issues.
                      Named contributors total{" "}
                      {currency(current.meta.contributor_total_usd)} net. The
                      unallocated net difference is{" "}
                      {currency(current.meta.unallocated_residual_usd)}; it is
                      not distributed across contributors. Accounting
                      adjustments are retained separately in the export.
                    </p>
                    <p>{current.meta.method_note}</p>
                    <p>
                      Entity attribution describes which Secretariat entity owns
                      the destination fund; it does not prove that a contributor
                      financed a particular expense.
                      {current.meta.unresolved_entity_amount_usd !== 0 &&
                        ` ${currency(current.meta.unresolved_entity_amount_usd)} of named contributions goes to funds whose entity mapping remains unresolved.`}
                    </p>
                  </div>
                }
                hint="Click on a contributor to explore details"
              />
            }
            yearControl={
              <YearSlider
                years={years.years}
                selectedYear={year}
                onChange={setYear}
              />
            }
            controls={
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Contributor groups"
              >
                {(Object.keys(GROUP_STYLES) as ContributorGroup[]).map(
                  (key) => (
                    <LegendLabel
                      key={key}
                      label={GROUP_STYLES[key].label}
                      color={GROUP_STYLES[key].color}
                      selected={!hiddenGroups.includes(key)}
                      onToggle={() =>
                        setHiddenGroups((current) =>
                          current.includes(key)
                            ? current.filter((item) => item !== key)
                            : [...current, key],
                        )
                      }
                    />
                  ),
                )}
              </div>
            }
            rows={rows.filter((row) => !hiddenGroups.includes(row.key))}
            search={{
              value: query,
              onChange: setQuery,
              label: "Search contributors",
              placeholder: "Search contributors...",
              predicate: (leafLabel, _subgroupLabel, _rowLabel, needle) =>
                matchesQuery(leafLabel, needle),
            }}
            summaries={[
              {
                key: "visible-total",
                label:
                  query || hiddenGroups.length
                    ? "Matching positive total"
                    : "Positive total",
                value: currency(visibleTotal),
              },
            ]}
            totalLabel="Total"
            showLeafValues
            plotClassName="h-[560px] sm:h-[680px] lg:h-[780px]"
            formatValue={(value) => currency(value)}
            formatAccessibleValue={(value) => currency(value)}
            renderTooltip={(context) => (
              <ContributorTooltip context={context} />
            )}
            emptyContent={
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No positive contributors match the selected groups and search.
              </div>
            }
          />
        </>
      )}

      {!current && !error && (
        <div className="flex h-[560px] items-center justify-center bg-gray-100 text-sm text-gray-500">
          Loading trust-fund contributions…
        </div>
      )}
      {error && (
        <div className="flex h-80 items-center justify-center bg-gray-100 text-sm text-red-700">
          {error}
        </div>
      )}
      {selected && current && (
        <TrustFundContributorSidebar
          key={selected.name}
          contributor={selected}
          meta={current.meta}
          onClose={() => {
            setSelectedName(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
