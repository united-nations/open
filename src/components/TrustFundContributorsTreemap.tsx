"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrustFundContributorSidebar } from "@/components/TrustFundContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { useYearRanges } from "@/lib/useYearRanges";
import { layoutGroups, squarifyDense } from "@/lib/treemapLayout";
import type { TrustFundContributor, TrustFundContributorsData } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type ContributorGroup = "governments" | "other";

const GROUP_STYLES: Record<
  ContributorGroup,
  { label: string; tile: string; color: string }
> = {
  governments: {
    label: "Governments",
    tile: "bg-un-blue text-slate-950",
    color: "#009edb",
  },
  other: {
    label: "Other contributors",
    tile: "bg-emerald-700 text-white",
    color: "#047857",
  },
} as const;

function groupOf(contributor: TrustFundContributor): ContributorGroup {
  return contributor.counterparty_group === "Government"
    ? "governments"
    : "other";
}

function currency(value: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function TrustFundContributorsTreemap() {
  const years = useYearRanges().trustFundContributors;
  const [year, setYear] = useState(years.default);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<TrustFundContributorsData | null>(null);
  const [loadError, setLoadError] = useState<{
    year: number;
    message: string;
  } | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "trust-fund-contributor",
    sectionId: "contributors",
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
      .then(setData)
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

  const current = data?.meta.year === year ? data : null;
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

  const contributors = useMemo(() => {
    if (!current) return [];
    const needle = query.trim().toLocaleLowerCase();
    return current.contributors.filter(
      (contributor) =>
        contributor.amount_usd > 0 &&
        (!needle || contributor.name.toLocaleLowerCase().includes(needle)),
    );
  }, [current, query]);
  const contributorGroups = useMemo(
    () =>
      (Object.keys(GROUP_STYLES) as ContributorGroup[])
        .map((key) => {
          const members = contributors
            .filter((contributor) => groupOf(contributor) === key)
            .sort(
              (a, b) =>
                b.amount_usd - a.amount_usd || a.name.localeCompare(b.name),
            );
          return {
            key,
            members,
            total: members.reduce(
              (sum, contributor) => sum + contributor.amount_usd,
              0,
            ),
          };
        })
        .filter((group) => group.total > 0)
        .sort((a, b) => b.total - a.total),
    [contributors],
  );
  const groupRectangles = useMemo(
    () =>
      layoutGroups(
        contributorGroups.map((group) => ({
          key: group.key,
          total: group.total,
        })),
        100,
        100,
        0.4,
        5,
      ).map((rectangle) => ({
        ...rectangle,
        data: contributorGroups.find((group) => group.key === rectangle.key)!,
      })),
    [contributorGroups],
  );
  const rectangles = useMemo(
    () =>
      groupRectangles.flatMap((groupRectangle) =>
        squarifyDense(
          groupRectangle.data.members.map((contributor) => ({
            value: contributor.amount_usd,
            data: contributor,
          })),
          groupRectangle.x,
          groupRectangle.y,
          groupRectangle.width,
          groupRectangle.height,
        ),
      ),
    [groupRectangles],
  );
  const nonPositiveCount =
    current?.contributors.filter((contributor) => contributor.amount_usd <= 0)
      .length ?? 0;

  const open = (contributor: TrustFundContributor) => {
    setSelectedName(contributor.name);
    replaceToSidebar("trust-fund-contributor", contributor.name);
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search contributors..."
        />
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={setYear}
        />
      </div>

      {current && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-un-blue" /> Governments
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-700" /> Other
                contributors
              </span>
            </div>
            <span>
              {currency(current.meta.contributor_total_usd, true)} named net ·{" "}
              {(current.meta.named_row_completeness * 100).toFixed(2)}%
              named-row reconciliation
            </span>
          </div>

          <div className="relative h-[560px] w-full bg-gray-100 sm:h-[680px] lg:h-[780px]">
            {groupRectangles.map((rectangle) => {
              const style = GROUP_STYLES[rectangle.data.key];
              return (
                <div
                  key={`label-${rectangle.data.key}`}
                  className="pointer-events-none absolute z-20 max-w-[60%] truncate bg-white/90 px-1.5 py-1 text-[10px] font-bold shadow-sm sm:text-xs"
                  style={{
                    left: `${rectangle.x}%`,
                    top: `${rectangle.y}%`,
                    color: style.color,
                  }}
                >
                  {style.label}
                </div>
              );
            })}
            {rectangles.length > 0 ? (
              rectangles.map((rectangle) => {
                const contributor = rectangle.data;
                const group = groupOf(contributor);
                const showName = rectangle.width > 4.5 && rectangle.height > 3;
                const showAmount = rectangle.width > 7 && rectangle.height > 5;
                return (
                  <Tooltip key={contributor.name} delayDuration={60}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => open(contributor)}
                        className={`absolute overflow-hidden text-left shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.75)] transition-[left,top,width,height,filter] duration-700 hover:z-10 hover:brightness-110 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset ${GROUP_STYLES[group].tile}`}
                        style={{
                          left: `${rectangle.x}%`,
                          top: `${rectangle.y}%`,
                          width: `${rectangle.width}%`,
                          height: `${rectangle.height}%`,
                        }}
                        aria-label={`${contributor.name}: ${currency(contributor.amount_usd)}`}
                      >
                        {showName && (
                          <span className="absolute inset-0 block overflow-hidden p-1.5 sm:p-2">
                            <span className="block truncate text-[10px] leading-tight font-semibold sm:text-xs">
                              {contributor.name}
                            </span>
                            {showAmount && (
                              <span className="mt-0.5 block truncate text-[10px] opacity-90 sm:text-xs">
                                {currency(contributor.amount_usd, true)}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg">
                      <p className="text-sm font-semibold">
                        {contributor.name}
                      </p>
                      <p className="text-xs">
                        {currency(contributor.amount_usd)} net recognized
                      </p>
                      <p className="text-xs text-slate-500">
                        {contributor.destinations.length} destination fund
                        {contributor.destinations.length === 1 ? "" : "s"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No positive contributors match your search.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs leading-relaxed text-gray-500">
            <p>
              Tile area is the signed net of named recognized-contribution rows;
              click a contributor to see its funds and reconstructed entity
              destinations.
              {nonPositiveCount > 0 &&
                ` ${nonPositiveCount} contributors with a zero or negative annual net are retained in the data but cannot be drawn as areas.`}
            </p>
            <p>
              Named rows account for{" "}
              {(current.meta.named_row_completeness * 100).toFixed(2)}% of the
              printed fund totals on an absolute-residual basis. The unallocated
              net residual is {currency(current.meta.unallocated_residual_usd)};
              it is not distributed across contributors. Present-value and
              internal-fund adjustments are also excluded from tiles and
              retained separately in the export.
            </p>
            <p>
              Entity attribution describes which Secretariat entity owns the
              destination fund; it does not prove that a contributor financed a
              particular expense.
              {current.meta.unresolved_entity_amount_usd !== 0 &&
                ` ${currency(current.meta.unresolved_entity_amount_usd)} of named contributions goes to funds whose entity mapping remains unresolved.`}
            </p>
            <a
              href={current.meta.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-un-blue hover:underline"
            >
              {current.meta.source.symbol}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
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
