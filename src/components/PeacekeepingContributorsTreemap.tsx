"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PeacekeepingContributorSidebar } from "@/components/PeacekeepingContributorSidebar";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { squarifyDense } from "@/lib/treemapLayout";
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

  const current = data?.meta.cycle_year === year ? data : null;
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
    return current.contributors
      .filter(
        (contributor) =>
          contributor.net_assessment > 0 &&
          (!needle || contributor.name.toLocaleLowerCase().includes(needle)),
      )
      .sort(
        (a, b) =>
          b.net_assessment - a.net_assessment || a.name.localeCompare(b.name),
      );
  }, [current, query]);
  const rectangles = useMemo(
    () =>
      squarifyDense(
        contributors.map((contributor) => ({
          value: contributor.net_assessment,
          data: contributor,
        })),
        0,
        0,
        100,
        100,
      ),
    [contributors],
  );
  const exceptionCount = current
    ? current.meta.verification.source_rate_anomalies.length +
      current.meta.verification.rows_derived_from_printed_totals.length
    : 0;

  const open = (contributor: PeacekeepingContributor) => {
    setSelectedName(contributor.name);
    replaceToSidebar("peacekeeping-contributor", contributor.name);
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search Member States..."
        />
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={setYear}
          formatLabel={cycleLabel}
        />
      </div>

      {current && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <span>
              Tile area represents each Member State&apos;s net assessed amount
            </span>
            <span>
              {currency(current.meta.total_net_assessment, true)} net ·{" "}
              {current.meta.coverage.contributors} Member States ·{" "}
              {current.meta.coverage.missions} missions
            </span>
          </div>

          <div className="relative h-[560px] w-full bg-gray-100 sm:h-[680px] lg:h-[780px]">
            {rectangles.length > 0 ? (
              rectangles.map((rectangle) => {
                const contributor = rectangle.data;
                const showName = rectangle.width > 4.5 && rectangle.height > 3;
                const showAmount = rectangle.width > 7 && rectangle.height > 5;
                return (
                  <Tooltip key={contributor.name} delayDuration={60}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => open(contributor)}
                        className="absolute overflow-hidden bg-un-blue text-left text-[#003B5C] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.85)] transition-[left,top,width,height,filter] duration-700 hover:z-10 hover:brightness-110 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
                        style={{
                          left: `${rectangle.x}%`,
                          top: `${rectangle.y}%`,
                          width: `${rectangle.width}%`,
                          height: `${rectangle.height}%`,
                        }}
                        aria-label={`${contributor.name}: ${currency(contributor.net_assessment)} net assessed`}
                      >
                        {showName && (
                          <span className="absolute inset-0 block overflow-hidden p-1.5 sm:p-2">
                            <span className="block truncate text-[10px] leading-tight font-semibold sm:text-xs">
                              {contributor.name}
                            </span>
                            {showAmount && (
                              <span className="mt-0.5 block truncate text-[10px] opacity-90 sm:text-xs">
                                {currency(contributor.net_assessment, true)}
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
                        {currency(contributor.net_assessment)} net assessed
                      </p>
                      <p className="text-xs text-slate-500">
                        {contributor.missions.length} mission accounts · click
                        for details
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                No contributors match your search.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs leading-relaxed text-gray-500">
            <p>
              Net assessments add assessment sections and subtract prior-period
              credits. They do not show payments received, arrears or voluntary
              contributions. Click a Member State to see its mission breakdown
              and source circulars.
            </p>
            {exceptionCount > 0 && (
              <p className="border-l-2 border-amber-500 pl-2 text-amber-800">
                This cycle contains {exceptionCount} disclosed source-data
                exception{exceptionCount === 1 ? "" : "s"}. The affected
                contributor sidebar and export explain how each was handled.
              </p>
            )}
            <a
              href={current.meta.source_page}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-un-blue hover:underline"
            >
              Committee on Contributions source index
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
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
