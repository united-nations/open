"use client";
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
import type { TrustFundContributor, TrustFundContributorsData } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type ContributorGroup = "governments" | "other";

const GROUP_STYLES: Record<
  ContributorGroup,
  { label: string; color: string; textColor: string }
> = {
  governments: {
    label: "Governments",
    color: "#009edb",
    textColor: "#ffffff",
  },
  other: {
    label: "Other contributors",
    color: "#047857",
    textColor: "#ffffff",
  },
};

function groupOf(contributor: TrustFundContributor): ContributorGroup {
  return contributor.counterparty_group === "Government"
    ? "governments"
    : "other";
}

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
    TrustFundContributor,
    never
  >;
}) {
  const contributor = context.leaf.data;
  if (!contributor) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold">{contributor.name}</p>
      <p className="text-xs">
        {currency(contributor.amount_usd)} net recognized
      </p>
      <p className="text-xs opacity-75">
        {contributor.destinations.length} destination fund
        {contributor.destinations.length === 1 ? "" : "s"}
      </p>
    </div>
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
  const positiveContributors = useMemo(
    () =>
      current?.contributors.filter(
        (contributor) => contributor.amount_usd > 0,
      ) ?? [],
    [current],
  );
  const rows = useMemo(() => {
    const result = (Object.keys(GROUP_STYLES) as ContributorGroup[]).map(
      (key) => {
        const members = positiveContributors
          .filter((contributor) => groupOf(contributor) === key)
          .sort(
            (a, b) =>
              b.amount_usd - a.amount_usd || a.name.localeCompare(b.name),
          );
        return {
          key,
          label: GROUP_STYLES[key].label,
          color: GROUP_STYLES[key].color,
          data: key,
          subgroups: members.map((contributor) => ({
            key: contributor.name,
            label: contributor.name,
            labelVisibility: "tooltip-only" as const,
            data: contributor.name,
            leaves: [
              {
                key: contributor.name,
                label: contributor.name,
                value: contributor.amount_usd,
                color: GROUP_STYLES[key].color,
                textColor: GROUP_STYLES[key].textColor,
                data: contributor,
                onActivate: () => open(contributor),
              },
            ],
          })),
        } satisfies GroupedTreemapRow<
          ContributorGroup,
          string,
          TrustFundContributor,
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
  }, [open, positiveContributors]);
  const visibleTotal = rows
    .filter((row) => !hiddenGroups.includes(row.key))
    .flatMap((row) => row.subgroups.flatMap((group) => group.leaves))
    .filter((leaf) => matchesQuery(leaf.label, query))
    .reduce((sum, leaf) => sum + leaf.value, 0);
  const nonPositiveCount =
    current?.contributors.filter((contributor) => contributor.amount_usd <= 0)
      .length ?? 0;

  return (
    <div className="relative w-full">
      <DelayedChartLoading
        pending={data?.meta.year !== year}
        requestKey={year}
      />
      {current && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              {currency(current.meta.contributor_total_usd)} named net ·{" "}
              {(current.meta.named_row_completeness * 100).toFixed(2)}%
              named-row reconciliation
            </span>
          </div>

          <GroupedTreemap<ContributorGroup, string, TrustFundContributor, never>
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
                      Tile area is the signed net of named
                      recognized-contribution rows; click a contributor to see
                      its funds and reconstructed entity destinations.
                      {nonPositiveCount > 0 &&
                        ` ${nonPositiveCount} contributors with a zero or negative annual net are retained in the data but cannot be drawn as areas.`}
                    </p>
                    <p>
                      Named rows account for{" "}
                      {(current.meta.named_row_completeness * 100).toFixed(2)}%
                      of the printed fund totals on an absolute-residual basis.
                      The unallocated net residual is{" "}
                      {currency(current.meta.unallocated_residual_usd)}; it is
                      not distributed across contributors. Present-value and
                      internal-fund adjustments are also excluded from tiles and
                      retained separately in the export.
                    </p>
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
