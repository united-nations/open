"use client";
import { revenueCoverage } from "@/lib/revenueCoverage";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFooter } from "@/components/ChartFooter";
import {
  CEB_ASSESSMENTS_HASH,
  CEB_ASSESSMENTS_SECTION,
} from "@/lib/cebAssessments";
import { FinancingInstrumentLabel } from "@/components/FinancingInstrumentLabel";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import {
  contributorCategoryViews,
  availableContributionTypes,
  contributorOriginLabel,
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
  getFinancingInstrumentLabel,
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
        `${getFinancingInstrumentLabel(type)}: ${formatBudget(value)}${value < 0 ? " (negative adjustment)" : ""}`,
    )
    .join("; ");
  return `Revenue including signed adjustments: ${formatBudget(netTotal)}. Financing instruments: ${instruments}.`;
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
      : contributor.category || "Non-Government";
  const breakdown = Object.entries(
    getContributionBreakdown(contributor.contributions),
  )
    .filter(([, value]) => value !== 0)
    .sort(
      ([left], [right]) =>
        getContributionTypeOrder(left) - getContributionTypeOrder(right),
    );

  return (
    <FinancialTooltip
      title={contributor.name}
      parents={[{ label: category, color: context.row.color }]}
      total={{
        label: "Revenue",
        value: formatBudget(context.leaf.value),
      }}
      rows={breakdown.map(([type, value]) => ({
        label:
          getFinancingInstrumentLabel(type) +
          (value < 0 ? " (negative adjustment)" : ""),
        value: formatBudget(value),
        color: context.leaf.segments?.find((segment) => segment.key === type)
          ?.color,
        share:
          value >= 0 && context.leaf.value > 0
            ? value / context.leaf.value
            : undefined,
      }))}
      notes={contributorOriginLabel(contributor.record_kind)}
      actionHint="Click to explore details"
    />
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
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "donor",
    sectionId: "donors",
    onNavigateAway: () => setSelectedContributor(null),
  });
  const [assessmentLink, setAssessmentLink] = useDeepLink({
    hashPrefix: CEB_ASSESSMENTS_HASH,
    sectionId: CEB_ASSESSMENTS_SECTION,
  });
  const [assessmentId, assessmentYear] = assessmentLink?.split("@") ?? [];
  const assessmentYears = yearRanges.cebAssessments;
  const assessmentInitialYear = assessmentYears.years.includes(
    Number(assessmentYear),
  )
    ? Number(assessmentYear)
    : assessmentYears.default;

  useEffect(() => {
    if (!loading && pendingDeepLink && contributors.length > 0) {
      const requestedYear = Number(
        new URLSearchParams(window.location.search).get("year"),
      );
      if (yearRanges.donors.years.includes(requestedYear)) {
        if (selectedYear !== requestedYear) {
          setSelectedYear(requestedYear);
          return;
        }
        if (loadedYear !== requestedYear) return;
      }
      const contributor = contributors.find(
        (candidate) => candidate.name === pendingDeepLink,
      );
      if (contributor) setSelectedContributor(contributor);
      setPendingDeepLink(null);
    }
  }, [
    contributors,
    loading,
    pendingDeepLink,
    setPendingDeepLink,
    selectedYear,
    loadedYear,
    yearRanges.donors.years,
  ]);

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
            ...info,
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
        setLoadedYear(selectedYear);
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
      setAssessmentLink(null);
      setSelectedContributor(
        contributors.find((item) => item.name === contributor.name) ??
          contributor,
      );
      replaceToSidebar("donor", contributor.name);
    },
    [contributors, setAssessmentLink],
  );

  const signedContributors = useMemo(
    () =>
      contributors.flatMap(contributorCategoryViews).map((contributor) => ({
        ...contributor,
        contributions: Object.fromEntries(
          Object.entries(contributor.contributions).map(([entity, amounts]) => [
            entity,
            Object.fromEntries(
              Object.entries(amounts).filter(([type]) =>
                selectedFunding.includes(type),
              ),
            ),
          ]),
        ),
      })),
    [contributors, selectedFunding],
  );

  const positiveContributors = useMemo(
    () =>
      signedContributors.filter(
        (item) => getTotalContributions(item.contributions) > 0,
      ),
    [signedContributors],
  );
  const availableFunding = availableContributionTypes(contributors);
  const visibleContributors = signedContributors.filter((item) =>
    matchesQuery(item.name, searchQuery),
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
        key: `${contributor.name}:${contributor.category}`,
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
                label: getFinancingInstrumentLabel(type),
                value,
                color:
                  isGovernmentDonor(contributor.status) || type === "Unresolved"
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
        label: category,
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
            layout={{
              rowOrder: "input",
              orderedBands: true,
              minBandHeight: 28,
              rowGap: 3,
            }}
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
                aria-label="Financing instruments"
              >
                {availableFunding.map(({ type }) => (
                  <FinancingInstrumentLabel
                    key={type}
                    type={type}
                    neutral
                    variant="pill"
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
            rows={rows.map((row) => ({
              ...row,
              value: visibleContributors
                .filter(
                  (item) =>
                    (isUnattributed(item)
                      ? "unattributed"
                      : isGovernmentDonor(item.status)
                        ? "government"
                        : "non-government") === row.key,
                )
                .reduce(
                  (sum, item) =>
                    sum + getTotalContributions(item.contributions),
                  0,
                ),
            }))}
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
            summaries={[
              {
                key: "net",
                label: searchQuery
                  ? "Matching revenue"
                  : revenueCoverage(selectedYear)?.controls === false
                    ? "Partial reported revenue"
                    : "Total revenue",
                value: formatBudget(
                  visibleContributors.reduce(
                    (sum, item) =>
                      sum + getTotalContributions(item.contributions),
                    0,
                  ),
                ),
              },
            ]}
            totalLabel={
              availableFunding.every(({ type }) =>
                selectedFunding.includes(type),
              )
                ? "Total revenue"
                : "Selected revenue"
            }
            plotClassName={SYSTEM_TREEMAP_HEIGHT_CLASS}
            showLeafValues
            formatValue={formatBudget}
            formatAccessibleValue={formatBudget}
            renderTooltip={(context) => (
              <ContributorTooltip context={context} />
            )}
            emptyContent={
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {!availableFunding.some(({ type }) =>
                  selectedFunding.includes(type),
                )
                  ? "Select a financing instrument to show revenue."
                  : "No contributors match the selected financing instruments and search."}
              </div>
            }
          />
        </>
      )}

      {loading && contributors.length === 0 && (
        <div
          className={`flex w-full items-center justify-center bg-gray-100 ${SYSTEM_TREEMAP_HEIGHT_CLASS}`}
        >
          <p className="text-lg text-gray-500">Loading contributors...</p>
        </div>
      )}

      {!loading && contributors.length === 0 && (
        <div
          className={`flex w-full items-center justify-center bg-gray-100 ${SYSTEM_TREEMAP_HEIGHT_CLASS}`}
        >
          <p className="text-lg text-gray-500">No revenue data available</p>
        </div>
      )}

      {(selectedContributor || assessmentId) && (
        <ContributorSidebar
          key={assessmentLink ?? selectedContributor?.name}
          contributor={
            assessmentId ? undefined : (selectedContributor ?? undefined)
          }
          assessmentId={assessmentId}
          initialYear={assessmentId ? assessmentInitialYear : selectedYear}
          onClose={() => {
            setSelectedContributor(null);
            setAssessmentLink(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
