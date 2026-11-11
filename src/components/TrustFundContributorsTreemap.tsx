"use client";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
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
import { TRUST_FUND_CONTRIBUTOR_GROUP_STYLES as GROUP_STYLES } from "@/lib/trustFundReporting";
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
  const isUnitemized = flow.group === "unitemized";
  return (
    <FinancialTooltip
      title={contributor.name}
      parents={[{ label: context.row.label, color: context.row.color }]}
      total={{
        label: isUnitemized
          ? "Voluntary contributions"
          : "Contributions and transfers",
        value: currency(flow.amount_usd),
      }}
      notes={
        flow.group === "category_unknown"
          ? "The source names this contributor without reporting a contributor category."
          : undefined
      }
      actionHint={
        isUnitemized
          ? "Click to explore recipient funds"
          : "Click to explore all contributor categories"
      }
    />
  );
}

export function TrustFundContributorsTreemap({
  selectedYear,
  onYearChange,
}: {
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}) {
  const years = useYearRanges().trustFundContributors;
  const [localYear, setLocalYear] = useState(years.default);
  const year = selectedYear ?? localYear;
  const setYear = onYearChange ?? setLocalYear;
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
  const signedTiles = tiles.filter(
    ({ contributor, flow }) =>
      !hiddenGroups.includes(flow.group) &&
      matchesQuery(contributor.name, query),
  );
  const visibleTotal = signedTiles.reduce(
    (sum, { flow }) => sum + flow.amount_usd,
    0,
  );

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
              <ChartFooter hint="Click on a contributor to explore details" />
            }
            yearControl={
              <YearSlider
                years={years.years}
                selectedYear={year}
                onChange={setYear}
              />
            }
            filterControls={
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Contributor groups"
              >
                {(Object.keys(GROUP_STYLES) as ContributorGroup[])
                  .filter(
                    (key) =>
                      (key !== "unitemized" && key !== "category_unknown") ||
                      tiles.some(({ flow }) => flow.group === key),
                  )
                  .map((key) => (
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
                  ))}
              </div>
            }
            rows={rows
              .filter((row) => !hiddenGroups.includes(row.key))
              .map((row) => ({
                ...row,
                value: signedTiles
                  .filter((item) => item.flow.group === row.key)
                  .reduce((sum, item) => sum + item.flow.amount_usd, 0),
              }))}
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
                  query || hiddenGroups.length ? "Matching total" : "Total",
                value: signedTiles.length ? (
                  <Tooltip
                    interactive
                    width={380}
                    content={
                      <div className="space-y-2 text-start font-normal">
                        <p>
                          Calculated sum of the signed contributor rows matching
                          the selected categories and search. The source pages
                          show the component amounts.
                        </p>
                        <SourceReferenceLinks
                          references={signedTiles.flatMap(
                            ({ flow }) => flow.supportingSources ?? [],
                          )}
                        />
                      </div>
                    }
                  >
                    <span tabIndex={0} className="cursor-help">
                      {currency(visibleTotal)}
                    </span>
                  </Tooltip>
                ) : (
                  "Not available"
                ),
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
