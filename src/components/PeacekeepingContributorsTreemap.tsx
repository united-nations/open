"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFooter } from "@/components/ChartFooter";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PeacekeepingContributorSidebar } from "@/components/PeacekeepingContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  PeacekeepingContributor,
  PeacekeepingContributorsData,
} from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function currency(value: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

function cycleLabel(year: number): string {
  return `${year}/${String(year + 1).slice(-2)}`;
}

function matchesQuery(name: string, query: string): boolean {
  return name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function ContributorTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<
    "member-states",
    never,
    PeacekeepingContributor,
    never
  >;
}) {
  const contributor = context.leaf.data;
  if (!contributor) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold">{contributor.name}</p>
      <p className="text-xs">
        {currency(contributor.net_assessment)} net assessed
      </p>
      <p className="text-xs opacity-75">
        {contributor.missions.length} mission account
        {contributor.missions.length === 1 ? "" : "s"} · click for details
      </p>
    </div>
  );
}

export function PeacekeepingContributorsTreemap() {
  const years = useYearRanges().peacekeepingContributors;
  const [year, setYear] = useState(years.default);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PeacekeepingContributorsData | null>(null);
  const [loadError, setLoadError] = useState<{
    year: number;
    message: string;
  } | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "peacekeeping-contributor",
    sectionId: "peacekeeping-contributors",
    onNavigateAway: () => setSelectedName(null),
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/data/peacekeeping-contributors-${year}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load peacekeeping data for ${year}`);
        }
        return response.json() as Promise<PeacekeepingContributorsData>;
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

  const exceptionCount = current
    ? current.meta.verification.source_rate_anomalies.length +
      current.meta.verification.rows_derived_from_printed_totals.length
    : 0;

  const open = useCallback((contributor: PeacekeepingContributor) => {
    setSelectedName(contributor.name);
    replaceToSidebar("peacekeeping-contributor", contributor.name);
  }, []);
  const positiveContributors = useMemo(
    () =>
      current?.contributors.filter(
        (contributor) => contributor.net_assessment > 0,
      ) ?? [],
    [current],
  );
  const rows = useMemo(
    () => [
      {
        key: "member-states",
        label: "Member States",
        color: "var(--color-un-blue-shade)",
        data: "member-states" as const,
        subgroups: positiveContributors
          .slice()
          .sort(
            (a, b) =>
              b.net_assessment - a.net_assessment ||
              a.name.localeCompare(b.name),
          )
          .map((contributor) => ({
            key: contributor.name,
            label: contributor.name,
            labelVisibility: "tooltip-only" as const,
            leaves: [
              {
                key: contributor.name,
                label: contributor.name,
                value: contributor.net_assessment,
                color: "var(--color-un-blue-shade)",
                textColor: "var(--color-un-white)",
                data: contributor,
                onActivate: () => open(contributor),
              },
            ],
          })),
      } satisfies GroupedTreemapRow<
        "member-states",
        never,
        PeacekeepingContributor,
        never
      >,
    ],
    [open, positiveContributors],
  );
  const visibleTotal = positiveContributors
    .filter((contributor) => matchesQuery(contributor.name, query))
    .reduce((sum, contributor) => sum + contributor.net_assessment, 0);

  return (
    <div className="relative w-full">
      <DelayedChartLoading pending={data?.meta.cycle_year !== year} requestKey={year} />
      {current && (
        <>
          <GroupedTreemap<
            "member-states",
            never,
            PeacekeepingContributor,
            never
          >
            footer={
              <ChartFooter
                details={
                  <div className="space-y-2">
                    <p>
                      The displayed total sums positive net assessments
                      represented by tiles. Zero and negative amounts are
                      excluded from the treemap.
                    </p>
                    <p>
                      <a
                        href={current.meta.source_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-un-blue underline"
                      >
                        Committee on Contributions source index
                      </a>
                    </p>
                    <p>
                      Net assessments add assessment sections and subtract
                      prior-period credits. They do not show payments received,
                      arrears or voluntary contributions. Click a Member State
                      to see its mission breakdown and source circulars.
                    </p>
                    {exceptionCount > 0 && (
                      <p className="border-l-2 border-amber-500 pl-2 text-amber-800">
                        This cycle contains {exceptionCount} disclosed
                        source-data exception{exceptionCount === 1 ? "" : "s"}.
                        The affected contributor sidebar and export explain how
                        each was handled.
                      </p>
                    )}
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
                formatLabel={cycleLabel}
              />
            }
            controls={undefined}
            showRowLabels={false}
            rows={rows}
            search={{
              value: query,
              onChange: setQuery,
              label: "Search Member States",
              placeholder: "Search Member States...",
              predicate: (leafLabel, _subgroupLabel, _rowLabel, needle) =>
                matchesQuery(leafLabel, needle),
            }}
            summaries={[
              {
                key: "visible-total",
                label: query ? "Matching total" : "Displayed total",
                value: currency(visibleTotal, true),
              },
            ]}
            totalLabel="Total"
            plotClassName="h-[560px] sm:h-[680px] lg:h-[780px]"
            formatValue={(value) => currency(value, true)}
            formatAccessibleValue={(value) => currency(value)}
            renderTooltip={(context) => (
              <ContributorTooltip context={context} />
            )}
            emptyContent={
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No contributors match your search.
              </div>
            }
          />
        </>
      )}

      {!current && !error && (
        <div className="flex h-[560px] items-center justify-center bg-gray-100 text-sm text-gray-500">
          Loading peacekeeping assessments…
        </div>
      )}
      {error && (
        <div className="flex h-80 items-center justify-center bg-gray-100 text-sm text-red-700">
          {error}
        </div>
      )}
      {selected && current && (
        <PeacekeepingContributorSidebar
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
