"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { YearSlider } from "@/components/YearSlider";
import { RegularBudgetPaymentTimeline } from "@/components/RegularBudgetPaymentTimeline";
import { squarify } from "@/lib/treemapLayout";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  RegularBudgetContributor,
  RegularBudgetContributorsData,
  RegularBudgetPaymentStatus,
} from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const STATUS_STYLES: Record<
  RegularBudgetPaymentStatus,
  {
    label: string;
    tile: string;
    swatch: string;
    text: string;
  }
> = {
  paid_on_time: {
    label: "Paid in full on time",
    tile: "bg-[#004987]",
    swatch: "bg-[#004987]",
    text: "text-white",
  },
  paid_late: {
    label: "Paid in full after due date",
    tile: "bg-[#66C6E8]",
    swatch: "bg-[#66C6E8]",
    text: "text-[#003B5C]",
  },
  not_paid_in_full: {
    label: "Not listed as paid in full",
    tile: "bg-[#EAF7FB]",
    swatch: "bg-[#EAF7FB]",
    text: "text-[#003B5C]",
  },
};

const STATUS_ORDER: RegularBudgetPaymentStatus[] = [
  "paid_on_time",
  "paid_late",
  "not_paid_in_full",
];

function formatCurrency(amount: number, compact = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function statusCount(
  data: RegularBudgetContributorsData,
  status: RegularBudgetPaymentStatus,
): number {
  if (status === "paid_on_time") return data.meta.paid_on_time_count;
  if (status === "paid_late") return data.meta.paid_late_count;
  return data.meta.not_paid_in_full_count;
}

export function RegularBudgetContributorsTreemap() {
  const years = useYearRanges().regularBudgetContributors;
  const [selectedYear, setSelectedYear] = useState(years.default);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadedData, setLoadedData] =
    useState<RegularBudgetContributorsData | null>(null);
  const [loadError, setLoadError] = useState<{
    year: number;
    message: string;
  } | null>(null);
  const data = loadedData?.meta.year === selectedYear ? loadedData : null;
  const error = loadError?.year === selectedYear ? loadError.message : null;
  const loading = data === null && error === null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/data/regular-budget-contributors-${selectedYear}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load regular-budget data for ${selectedYear}`,
          );
        }
        return response.json() as Promise<RegularBudgetContributorsData>;
      })
      .then((payload) => {
        setLoadedData(payload);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setLoadError({
          year: selectedYear,
          message:
            reason instanceof Error ? reason.message : "Failed to load data",
        });
      });
    return () => controller.abort();
  }, [selectedYear]);

  const filteredContributors = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return data.contributors;
    return data.contributors.filter((contributor) =>
      contributor.name.toLocaleLowerCase().includes(query),
    );
  }, [data, searchQuery]);

  const statusRows = useMemo(() => {
    if (!data) return [];

    const total = data.contributors.reduce(
      (sum, contributor) => sum + contributor.assessment_amount,
      0,
    );
    let y = 0;

    return STATUS_ORDER.map((status) => {
      const contributors = data.contributors.filter(
        (contributor) => contributor.payment_status === status,
      );
      const assessmentTotal = contributors.reduce(
        (sum, contributor) => sum + contributor.assessment_amount,
        0,
      );
      const height = (assessmentTotal / total) * 100;
      const row = { status, y, height, assessmentTotal };
      y += height;
      return row;
    });
  }, [data]);

  const rectangles = useMemo(
    () =>
      statusRows.flatMap((row) =>
        squarify(
          filteredContributors
            .filter((contributor) => contributor.payment_status === row.status)
            .map((contributor) => ({
              value: contributor.assessment_amount,
              data: contributor,
            })),
          0,
          row.y,
          100,
          row.height,
        ),
      ),
    [filteredContributors, statusRows],
  );

  const renderTile = (
    rectangle: (typeof rectangles)[number],
    contributor: RegularBudgetContributor,
  ) => {
    const style = STATUS_STYLES[contributor.payment_status];
    const showName = rectangle.width > 4.5 && rectangle.height > 3;
    const showAmount = rectangle.width > 6 && rectangle.height > 5;
    const paymentDetail =
      contributor.payment_status === "not_paid_in_full"
        ? `Not listed as paid in full as of ${formatDate(data!.meta.as_of)}`
        : `${style.label} on ${formatDate(contributor.payment_date!)}`;

    return (
      <Tooltip key={contributor.name} delayDuration={60}>
        <TooltipTrigger asChild>
          <div
            role="img"
            tabIndex={0}
            className={`absolute overflow-hidden text-left transition-[left,top,width,height,filter] duration-700 hover:z-10 hover:brightness-110 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset ${contributor.payment_status === "not_paid_in_full" ? "shadow-[inset_0_0_0_2px_#004987]" : "shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.75)]"} ${style.tile} ${style.text}`}
            style={{
              left: `${rectangle.x}%`,
              top: `${rectangle.y}%`,
              width: `${rectangle.width}%`,
              height: `${rectangle.height}%`,
            }}
            aria-label={`${contributor.name}: ${formatCurrency(contributor.assessment_amount)}, ${style.label}`}
          >
            {showName && (
              <span className="absolute inset-0 block overflow-hidden p-1.5 sm:p-2">
                <span className="block truncate text-[10px] leading-tight font-semibold sm:text-xs">
                  {contributor.name}
                </span>
                {showAmount && (
                  <span className="mt-0.5 block truncate text-[10px] leading-tight opacity-90 sm:text-xs">
                    {formatCurrency(contributor.assessment_amount, true)} ·{" "}
                    {contributor.assessment_rate.toFixed(3)}%
                  </span>
                )}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          hideWhenDetached
          collisionPadding={12}
          className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg"
        >
          <div className="space-y-1 p-1 text-center">
            <p className="text-sm font-semibold">{contributor.name}</p>
            <p className="text-xs font-medium text-slate-700">
              {formatCurrency(contributor.assessment_amount)} assessment
            </p>
            <p className="text-xs text-slate-500">
              {contributor.assessment_rate.toFixed(3)}% assessment rate
            </p>
            <p className="text-xs text-slate-600">{paymentDetail}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search Member States..."
        />
        <YearSlider
          years={years.years}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
          disabled={loading}
        />
      </div>

      {data && (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {STATUS_ORDER.map((status) => {
                const style = STATUS_STYLES[status];
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <span
                      className={`h-3 w-3 rounded-sm border border-gray-200 ${style.swatch}`}
                    />
                    <span className="text-xs text-gray-600">
                      {style.label} ({statusCount(data, status)})
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 sm:text-right">
              {formatCurrency(data.meta.assessment_total, true)} assessed ·
              status as of {formatDate(data.meta.as_of)}
            </p>
          </div>

          <div className="relative h-[560px] w-full bg-gray-100 sm:h-[680px] lg:h-[780px]">
            {rectangles.length > 0 ? (
              rectangles.map((rectangle) =>
                renderTile(rectangle, rectangle.data),
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-500">
                  No Member States match your search.
                </p>
              </div>
            )}
            {statusRows.map((row, index) => {
              if (row.status === "not_paid_in_full") {
                return (
                  <div
                    key={row.status}
                    className="pointer-events-none absolute inset-x-0 z-20 h-1 -translate-y-full bg-white"
                    style={{ top: `${row.y}%` }}
                    aria-hidden="true"
                  />
                );
              }
              return (
                <div
                  key={row.status}
                  className={`pointer-events-none absolute inset-x-0 z-20 border-white ${index === 0 ? "" : "border-t-4"}`}
                  style={{ top: `${row.y}%`, height: `${row.height}%` }}
                  aria-hidden="true"
                />
              );
            })}
          </div>

          <RegularBudgetPaymentTimeline data={data} />

          <div className="mt-4 space-y-2 text-xs leading-relaxed text-gray-500">
            <p>
              Tile area uses each Member State&apos;s assessment in the official{" "}
              <a
                href={data.meta.sources.assessment_document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                {data.meta.sources.assessment_document.symbol} assessment
                circular
              </a>
              . Payment colour and date use the{" "}
              <a
                href={data.meta.sources.honour_roll.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                UN regular-budget honour roll
              </a>
              . Assessment rates are checked against the{" "}
              <a
                href={data.meta.sources.scale.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-700"
              >
                historical scale of assessments
              </a>
              .
            </p>
            <p>
              “Not listed as paid in full” may include Member States that made a
              partial payment. It does not mean that no payment was made.
            </p>
            {data.meta.year >= 2025 && (
              <p>
                From 2025, the circular&apos;s total includes the Peacebuilding
                Fund portion assessed in the regular-budget circular. Other
                assessed and extrabudgetary contributions are excluded from this
                view.
              </p>
            )}
            {data.meta.amount_reconciliation.discrepancies.length > 0 && (
              <p>
                The honour roll and assessment circular differ for{" "}
                {data.meta.amount_reconciliation.discrepancies.length} Member
                State
                {data.meta.amount_reconciliation.discrepancies.length === 1
                  ? ""
                  : "s"}
                ; the treemap uses the assessment circular amount.
              </p>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="flex h-[560px] items-center justify-center bg-gray-100 sm:h-[680px] lg:h-[780px]">
          <p className="text-sm text-gray-500">
            Loading regular-budget assessments...
          </p>
        </div>
      )}
      {!loading && error && (
        <div className="flex h-80 items-center justify-center bg-gray-100 px-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
