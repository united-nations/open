"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFooter } from "@/components/ChartFooter";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import { ClickHint } from "@/components/ui/ClickHint";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import {
  CATEGORY_LABELS,
  CONTRIBUTION_TYPES,
  type Contributor,
  type ContributorData,
  formatBudget,
  getContributionTypeOrder,
  getDisplayName,
  getStatusStyle,
  getTotalContributions,
  isGovernmentDonor,
  isUnattributed,
} from "@/lib/contributors";
import {
  FINANCING_SOURCE_KEYS,
  getFinancingInstrumentColor,
} from "@/lib/financingInstruments";
import { generateYearRange, useYearRanges } from "@/lib/useYearRanges";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type ContributorRow = "government" | "non-government" | "unattributed";

const ROWS: Record<
  ContributorRow,
  { label: string; color: string; textColor: string }
> = {
  government: {
    label: "Government",
    color: "var(--color-un-blue)",
    textColor: "#ffffff",
  },
  "non-government": {
    label: "Non-Government",
    color: "var(--color-smoky)",
    textColor: "#ffffff",
  },
  unattributed: {
    label: "Unattributed",
    color: "var(--color-dusty-gray)",
    textColor: "#ffffff",
  },
};

function getContributionBreakdown(
  contributions: Record<string, Record<string, number>>,
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  Object.values(contributions).forEach((entityContributions) => {
    Object.entries(entityContributions).forEach(([type, amount]) => {
      breakdown[type] = (breakdown[type] ?? 0) + amount;
    });
  });
  return breakdown;
}

function matchesQuery(name: string, query: string): boolean {
  return name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function describeSignedBreakdown(
  breakdown: readonly (readonly [string, number])[],
  netTotal: number,
): string {
  const instruments = breakdown
    .map(
      ([type, value]) =>
        `${type}: ${formatBudget(value)}${value < 0 ? " (negative adjustment)" : ""}`,
    )
    .join("; ");
  return `Net total: ${formatBudget(netTotal)}. Financing instruments: ${instruments}.`;
}

function ContributorTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<
    ContributorRow,
    string,
    Contributor,
    string
  >;
}) {
  const contributor = context.leaf.data;
  if (!contributor) return null;

  const styles = getStatusStyle(contributor.status);
  const category = isUnattributed(contributor)
    ? "Unattributed"
    : isGovernmentDonor(contributor.status)
      ? styles.label
      : CATEGORY_LABELS[contributor.category] ||
        contributor.category ||
        "Non-Government";
  const breakdown = Object.entries(
    getContributionBreakdown(contributor.contributions),
  )
    .filter(([, value]) => value !== 0)
    .sort(
      ([left], [right]) =>
        getContributionTypeOrder(left) - getContributionTypeOrder(right),
    );

  return (
    <div className="space-y-1" aria-live="polite" aria-atomic="true">
      <p className="text-xs opacity-75">{context.breadcrumb.join(" › ")}</p>
      <p className="text-sm font-semibold">{contributor.name}</p>
      <p className="text-xs opacity-75">{category}</p>
      <p className="text-xs font-semibold">
        Net total: {formatBudget(context.leaf.value)}
      </p>
      {breakdown.map(([type, value]) => (
        <div key={type} className="flex justify-between gap-4 text-xs">
          <span>
            {type}
            {value < 0 ? " (negative adjustment)" : ""}
          </span>
          <span className="tabular-nums">{formatBudget(value)}</span>
        </div>
      ))}
      <ClickHint
        text={
          contributor.is_other ? "Click for breakdown" : "Click for details"
        }
      />
    </div>
  );
}

export function ContributorsTreemap() {
  const yearRanges = useYearRanges();
  const years = generateYearRange(yearRanges.donors.min, yearRanges.donors.max);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [selectedContributor, setSelectedContributor] =
    useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFunding, setSelectedFunding] = useState<string[]>(() =>
    CONTRIBUTION_TYPES.map(({ type }) => type),
  );
  const [selectedYear, setSelectedYear] = useState(yearRanges.donors.default);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "donor",
    sectionId: "donors",
    onNavigateAway: () => setSelectedContributor(null),
  });

  useEffect(() => {
    if (!loading && pendingDeepLink && contributors.length > 0) {
      const contributor = contributors.find(
        (candidate) => candidate.name === pendingDeepLink,
      );
      if (contributor) setSelectedContributor(contributor);
      setPendingDeepLink(null);
    }
  }, [contributors, loading, pendingDeepLink, setPendingDeepLink]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${basePath}/data/donors-${selectedYear}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Failed to load ${selectedYear} data`);
        return response.json() as Promise<Record<string, ContributorData>>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setContributors(
          Object.entries(data).map(([name, info]) => ({
            name,
            status: info.status,
            category:
              info.category ||
              (isGovernmentDonor(info.status)
                ? "Government"
                : "Non-Government"),
            contributions: info.contributions,
            is_other: info.is_other,
          })),
        );
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        console.error("Failed to load donors data:", reason);
        setContributors([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [selectedYear]);

  const open = useCallback(
    (contributor: Contributor) => {
      setSelectedContributor(
        contributors.find((item) => item.name === contributor.name) ??
          contributor,
      );
      replaceToSidebar("donor", contributor.name);
    },
    [contributors],
  );

  const positiveContributors = useMemo(
    () =>
      contributors
        .map((contributor) => ({
          ...contributor,
          contributions: Object.fromEntries(
            Object.entries(contributor.contributions).map(
              ([entity, amounts]) => [
                entity,
                Object.fromEntries(
                  Object.entries(amounts).filter(([type]) =>
                    selectedFunding.includes(type),
                  ),
                ),
              ],
            ),
          ),
        }))
        .filter(
          (contributor) => getTotalContributions(contributor.contributions) > 0,
        ),
    [contributors, selectedFunding],
  );

  const toLeaf = useCallback(
    (contributor: Contributor) => {
      const breakdown = getContributionBreakdown(contributor.contributions);
      const breakdownEntries = Object.entries(breakdown)
        .filter(([, value]) => value !== 0)
        .sort(
          ([left], [right]) =>
            getContributionTypeOrder(left) - getContributionTypeOrder(right),
        );
      const row = isUnattributed(contributor)
        ? ROWS.unattributed
        : isGovernmentDonor(contributor.status)
          ? ROWS.government
          : ROWS["non-government"];
      const hasNegativeAdjustment = breakdownEntries.some(
        ([, value]) => value < 0,
      );
      const netTotal = getTotalContributions(contributor.contributions);
      return {
        key: contributor.name,
        label: getDisplayName(contributor.name),
        value: netTotal,
        color: row.color,
        textColor: row.textColor,
        accessibleDescription: hasNegativeAdjustment
          ? describeSignedBreakdown(breakdownEntries, netTotal)
          : undefined,
        data: contributor,
        segments:
          !isUnattributed(contributor) && !hasNegativeAdjustment
            ? [...breakdownEntries].reverse().map(([type, value]) => ({
                key: type,
                label: type,
                value,
                color: isGovernmentDonor(contributor.status)
                  ? getFinancingInstrumentColor(type)
                  : `color-mix(in srgb, ${row.color} ${type === "Assessed" ? 64 : type === "Voluntary un-earmarked" ? 76 : type === "Voluntary earmarked" ? 88 : 100}%, black)`,
                data: type,
              }))
            : undefined,
        onActivate: () => open(contributor),
      };
    },
    [open],
  );

  const rows = useMemo(() => {
    const government = positiveContributors
      .filter(
        (contributor) =>
          isGovernmentDonor(contributor.status) && !isUnattributed(contributor),
      )
      .sort(
        (left, right) =>
          getTotalContributions(right.contributions) -
            getTotalContributions(left.contributions) ||
          left.name.localeCompare(right.name),
      );
    const nonGovernment = positiveContributors.filter(
      (contributor) =>
        !isGovernmentDonor(contributor.status) && !isUnattributed(contributor),
    );
    const unattributed = positiveContributors
      .filter(isUnattributed)
      .sort(
        (left, right) =>
          getTotalContributions(right.contributions) -
            getTotalContributions(left.contributions) ||
          left.name.localeCompare(right.name),
      );

    const groupedCategories = nonGovernment.reduce<
      Record<string, Contributor[]>
    >((result, contributor) => {
      const category = contributor.category || "Other";
      (result[category] ??= []).push(contributor);
      return result;
    }, {});
    const categories = Object.entries(groupedCategories)
      .map(([category, members]) => ({
        key: category,
        label: CATEGORY_LABELS[category] || category,
        data: category,
        labelVisibility: "tooltip-only" as const,
        leaves: members
          .sort(
            (left, right) =>
              getTotalContributions(right.contributions) -
                getTotalContributions(left.contributions) ||
              left.name.localeCompare(right.name),
          )
          .map(toLeaf),
      }))
      .sort(
        (left, right) =>
          right.leaves.reduce((sum, leaf) => sum + leaf.value, 0) -
            left.leaves.reduce((sum, leaf) => sum + leaf.value, 0) ||
          left.label.localeCompare(right.label),
      );

    return [
      {
        key: "government",
        label: ROWS.government.label,
        color: ROWS.government.color,
        data: "government" as const,
        subgroups: government.map((contributor) => ({
          key: contributor.name,
          label: getDisplayName(contributor.name),
          data: contributor.name,
          labelVisibility: "tooltip-only" as const,
          leaves: [toLeaf(contributor)],
        })),
      },
      {
        key: "non-government",
        label: ROWS["non-government"].label,
        color: ROWS["non-government"].color,
        data: "non-government" as const,
        subgroups: categories,
      },
      {
        key: "unattributed",
        label: ROWS.unattributed.label,
        color: ROWS.unattributed.color,
        data: "unattributed" as const,
        leaves: unattributed.map(toLeaf),
      },
    ].filter(
      (row) => (row.leaves?.length ?? row.subgroups?.length ?? 0) > 0,
    ) satisfies GroupedTreemapRow<
      ContributorRow,
      string,
      Contributor,
      string
    >[];
  }, [positiveContributors, toLeaf]);

  return (
    <div className="relative w-full" aria-busy={loading}>
      <DelayedChartLoading pending={loading} requestKey={selectedYear} />
      {contributors.length > 0 && (
        <>
          <GroupedTreemap<ContributorRow, string, Contributor, string>
            layout={{ rowOrder: "input", consolidateSmallRows: false }}
            footer={
              <ChartFooter hint="Click on a contributor to explore details" />
            }
            yearControl={
              <YearSlider
                years={years}
                selectedYear={selectedYear}
                onChange={setSelectedYear}
              />
            }
            controls={
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Funding sources"
              >
                {CONTRIBUTION_TYPES.map(({ type }) => (
                  <FundingSourceLabel
                    key={type}
                    source={FINANCING_SOURCE_KEYS[type]}
                    selected={selectedFunding.includes(type)}
                    onToggle={() =>
                      setSelectedFunding((current) =>
                        current.includes(type)
                          ? current.filter((item) => item !== type)
                          : [...current, type],
                      )
                    }
                  />
                ))}
              </div>
            }
            rows={rows}
            search={{
              value: searchQuery,
              onChange: setSearchQuery,
              label: "Search contributors",
              placeholder: "Search contributors...",
              predicate: (leafLabel, _subgroupLabel, _rowLabel, query) =>
                positiveContributors.some(
                  (contributor) =>
                    getDisplayName(contributor.name) === leafLabel &&
                    matchesQuery(contributor.name, query),
                ),
            }}
            totalLabel={
              selectedFunding.length === CONTRIBUTION_TYPES.length
                ? "Total"
                : "Selected funding total"
            }
            plotClassName="h-[560px] sm:h-[680px] lg:h-[780px]"
            showLeafValues
            formatValue={formatBudget}
            formatAccessibleValue={formatBudget}
            renderTooltip={(context) => (
              <ContributorTooltip context={context} />
            )}
            emptyContent={
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {selectedFunding.length === 0
                  ? "Select a funding source to show contributions."
                  : "No contributors match the selected funding sources and search."}
              </div>
            }
          />
        </>
      )}

      {loading && contributors.length === 0 && (
        <div className="flex h-[780px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">Loading contributors...</p>
        </div>
      )}

      {!loading && contributors.length === 0 && (
        <div className="flex h-[780px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            No contribution data available
          </p>
        </div>
      )}

      {selectedContributor && (
        <ContributorSidebar
          contributor={selectedContributor}
          initialYear={selectedYear}
          onClose={() => {
            setSelectedContributor(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
