"use client";
import { SHOW_POOLED_FUNDS } from "@/lib/featureFlags";
import { PooledFundsProfileSection } from "@/components/PooledFundsProfileSection";
import { revenueCoverage } from "@/lib/revenueCoverage";
import { useSidebarSectionScroll } from "@/hooks/useSidebarSectionScroll";
import { useYearResource } from "@/hooks/useYearResource";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import {
  CebAssessmentSidebarContent,
  useCebAssessmentHistory,
} from "@/components/CebAssessmentSidebarContent";
import { CEB_ASSESSMENTS_HASH } from "@/lib/cebAssessments";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  contributorOriginLabel,
  contributorFinancingPoint,
  Contributor,
  formatBudget,
  getContributionTypeOrder,
  getTotalContributions,
  isGovernmentDonor,
} from "@/lib/contributors";
import { SidebarControls } from "@/components/SidebarControls";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { useRouter } from "next/navigation";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelTotalRow,
  FinancialPanelBreakdownRow,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import {
  FinancingInstrumentChart,
  FinancingInstrumentDataPoint,
} from "@/components/charts/FinancingInstrumentChart";
import { FinancingInstrumentLabel } from "@/components/FinancingInstrumentLabel";
import {
  getFinancingInstrumentColor,
  getFinancingInstrumentLabel,
} from "@/lib/financingInstruments";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface ContributorTrendsData {
  meta: { years: number[] };
  aggregates: Record<
    string,
    {
      year: number;
      available?: boolean;
      financingIncomplete?: boolean;
      unresolved?: number;
      assessed: number;
      voluntary_earmarked: number;
      voluntary_unearmarked: number;
    }[]
  >;
  contributors: Record<
    string,
    {
      year: number;
      available?: boolean;
      financingIncomplete?: boolean;
      unresolved?: number;
      other: number;
      assessed: number;
      voluntary_earmarked: number;
      voluntary_unearmarked: number;
    }[]
  >;
}

interface ContributorSidebarProps {
  contributor?: Contributor;
  assessmentId?: string;
  initialYear: number;
  initialSection?: "assessments";
  onClose: () => void;
}

const getContributionBreakdown = (
  contributions: Record<string, Record<string, number>>,
): Record<string, number> => {
  const breakdown: Record<string, number> = {};
  Object.values(contributions).forEach((entityContribs) => {
    Object.entries(entityContribs).forEach(([type, amount]) => {
      breakdown[type] = (breakdown[type] || 0) + amount;
    });
  });
  return breakdown;
};

const formatBudgetFixed = sharedFormatBudget;

export function ContributorSidebar({
  contributor,
  assessmentId,
  initialYear,
  initialSection,
  onClose,
}: ContributorSidebarProps) {
  const router = useRouter();
  const [showAllEntities, setShowAllEntities] = useState(false);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears =
    initialSection === "assessments"
      ? [...yearRanges.cebAssessments.years].reverse()
      : generateYearRange(
          yearRanges.donors.min,
          yearRanges.donors.max,
        ).reverse();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const assessmentHistory = useCebAssessmentHistory(
    assessmentId,
    contributor?.record_kind === "reported_aggregate" ||
      contributor?.record_kind === "calculated_balance"
      ? undefined
      : contributor?.name,
  );
  const assessmentContributor = assessmentHistory.value?.find(
    ({ name }) => name,
  );
  const revenueName = contributor?.name ?? assessmentContributor?.name;
  const revenueAliases = assessmentContributor?.aliases;
  const title = revenueName ?? "Assessed contributor";
  const loadYear = useCallback(async (): Promise<Contributor | null> => {
    const data = await fetch(
      `${basePath}/data/donors-${selectedYear}.json`,
    ).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<Record<string, Contributor>>;
    });
    const name = [revenueName, ...(revenueAliases ?? [])].find(
      (candidate) => candidate && Object.hasOwn(data, candidate),
    );
    return name ? { ...data[name], name } : null;
  }, [selectedYear, revenueName, revenueAliases]);
  const {
    value: yearContributor,
    loading: loadingYear,
    error: yearError,
  } = useYearResource<Contributor | null>(
    `${revenueName}-${selectedYear}`,
    contributor ?? null,
    !revenueName || (!!contributor && selectedYear === initialYear),
    loadYear,
    null,
  );

  // Trends data for chart
  const [trendsData, setTrendsData] = useState<FinancingInstrumentDataPoint[]>(
    [],
  );

  const focusTrapRef = useRef<HTMLDivElement>(null);
  useSidebarSectionScroll(
    focusTrapRef,
    initialSection,
    !loadingYear && !assessmentHistory.loading,
  );

  // Fetch contributor trends data on mount
  const trendName = yearContributor?.name ?? revenueName;
  const trendCategory = contributor?.category ?? yearContributor?.category;
  useEffect(() => {
    if (!trendName) return;
    let active = true;
    fetch(`${basePath}/data/contributor-trends.json`)
      .then((res) => res.json())
      .then((data: ContributorTrendsData) => {
        const contributorData = data.contributors[trendName];
        if (active) {
          setTrendsData(
            (contributorData ?? []).map((item) =>
              contributorFinancingPoint(
                item,
                !(
                  revenueCoverage(item.year)?.government === false &&
                  trendCategory === "Government"
                ),
              ),
            ),
          );
        }
      })
      .catch(() => {
        if (active) setTrendsData([]);
      });
    return () => {
      active = false;
    };
  }, [trendName, trendCategory]);

  if (!contributor && !assessmentId) return null;

  // Use year-specific data when available
  const displayContributor = yearContributor;
  const totalContributions = getTotalContributions(
    displayContributor?.contributions ?? {},
  );
  const breakdown = getContributionBreakdown(
    displayContributor?.contributions ?? {},
  );
  const breakdownEntries = Object.entries(breakdown).sort(
    (a, b) => getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0]),
  );

  const entityContributions = Object.entries(
    displayContributor?.contributions ?? {},
  )
    .map(([entity, types]) => {
      const total = Object.values(types).reduce((sum, val) => sum + val, 0);
      return {
        entity,
        total,
        typeBreakdown: types,
      };
    })
    .sort((a, b) => b.total - a.total);

  const sidebarTitleId = `contributor-sidebar-title`;
  const assessmentContent =
    assessmentId || assessmentHistory.value?.some(({ rows }) => rows.length) ? (
      <CebAssessmentSidebarContent
        resource={assessmentHistory}
        year={selectedYear}
      />
    ) : null;

  return (
    <DetailDrawer
      titleId={sidebarTitleId}
      onClose={onClose}
      ref={focusTrapRef}
      swipeToClose
      className="overflow-hidden sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px]"
    >
      <FinancialDetailPanel
        contentClassName="sidebar-scroll-content"
        title={<DrawerTitle>{title}</DrawerTitle>}
        titleId={sidebarTitleId}
        className="sm:w-full"
        yearSelectorPlacement="header"
        yearSelector={{
          years: availableYears,
          selected: selectedYear,
          onChange: setSelectedYear,
          label: "Select year",
          pending: loadingYear,
          pendingLabel: "Loading...",
        }}
        controls={
          <SidebarControls
            shareHash={
              assessmentId
                ? `${CEB_ASSESSMENTS_HASH}=${encodeURIComponent(`${assessmentId}@${selectedYear}`)}`
                : `donor=${encodeURIComponent(title)}`
            }
            onClose={onClose}
            closeLabel="Close sidebar"
          />
        }
      >
        <div className="relative space-y-6">
          {displayContributor &&
            (displayContributor.record_kind === "reported_aggregate" ||
              displayContributor.record_kind === "calculated_balance") && (
              <p className="text-sm text-gray-600">
                {contributorOriginLabel(displayContributor.record_kind)}
                {displayContributor.record_kind === "calculated_balance" &&
                  ". Calculated from reported control totals minus the available contributor detail; signed differences are retained."}
              </p>
            )}
          {displayContributor &&
            displayContributor.categories &&
            displayContributor.categories.length > 1 && (
              <div className="space-y-2 text-sm">
                <FinancialPanelHeading subheading>
                  CEB contributor categories
                </FinancialPanelHeading>
                {displayContributor.categories.map((category) => (
                  <FinancialPanelTotalRow
                    key={category}
                    label={category}
                    value={formatBudget(
                      getTotalContributions(
                        displayContributor.categoryContributions?.[category] ??
                          {},
                      ),
                    )}
                  />
                ))}
              </div>
            )}
          <DelayedChartLoading
            pending={loadingYear && !initialSection}
            requestKey={selectedYear}
          />
          {revenueName && !displayContributor && (
            <p className="text-sm text-gray-500 italic">
              {loadingYear
                ? "Loading…"
                : yearError
                  ? `Data could not be loaded for ${selectedYear}.`
                  : `No contribution data available for ${title} in ${selectedYear}.`}
            </p>
          )}
          {displayContributor && (
            <>
              {!isGovernmentDonor(displayContributor.status) &&
                displayContributor.category &&
                displayContributor.category !== "Non-Government" &&
                displayContributor.category !== "Multiple categories" && (
                  <div>
                    <span className="text-base font-semibold text-gray-900">
                      Category
                    </span>
                    <div className="mt-0.5">
                      <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
                        {displayContributor.category}
                      </span>
                    </div>
                  </div>
                )}

              <div>
                <FinancialPanelTotalRow
                  label="Contributions"
                  value={formatBudget(totalContributions)}
                />

                <div className="mt-4">
                  <FinancialPanelHeading subheading>
                    By financing instrument
                  </FinancialPanelHeading>
                  <div className="mt-2 space-y-2">
                    {breakdownEntries.map(([type, amount]) => (
                      <FinancialPanelBreakdownRow
                        key={type}
                        label={
                          <FinancingInstrumentLabel
                            type={type}
                            showMarker={false}
                          />
                        }
                        value={formatBudget(amount)}
                        color={getFinancingInstrumentColor(type)}
                        percent={
                          (Math.max(0, amount) /
                            Math.max(
                              1,
                              ...breakdownEntries.map(([, value]) =>
                                Math.max(0, value),
                              ),
                            )) *
                          100
                        }
                      />
                    ))}
                  </div>
                  {trendsData.length > 0 && (
                    <div className="mt-3">
                      <FinancingInstrumentChart
                        data={trendsData}
                        allowNegative
                        compact
                        showLegend={false}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <FinancialPanelHeading subheading>
                    By entity
                  </FinancialPanelHeading>
                  <div className="mt-2 space-y-1.5">
                    {(() => {
                      const displayedEntities = showAllEntities
                        ? entityContributions
                        : entityContributions.slice(0, 10);
                      const maxTotal = Math.max(
                        ...entityContributions.map((c) => c.total),
                      );

                      return (
                        <>
                          {displayedEntities.map((contrib) => {
                            const typeEntries = Object.entries(
                              contrib.typeBreakdown,
                            ).sort(
                              (a, b) =>
                                getContributionTypeOrder(a[0]) -
                                getContributionTypeOrder(b[0]),
                            );
                            const normalizedWidth =
                              (contrib.total / maxTotal) * 100;

                            return (
                              <FinancialPanelRankedRow
                                key={contrib.entity}
                                label={contrib.entity}
                                value={formatBudgetFixed(contrib.total)}
                                onClick={() =>
                                  router.push(
                                    `/system/organizations/?year=${selectedYear}#entity=${encodeURIComponent(`${contrib.entity}@${selectedYear}`)}`,
                                  )
                                }
                              >
                                <Tooltip delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-1 cursor-help flex-col gap-px">
                                      <FinancialPanelBar
                                        percent={normalizedWidth}
                                        segments={typeEntries
                                          .filter(([, amount]) => amount > 0)
                                          .map(([type, amount]) => ({
                                            id: type,
                                            percent:
                                              (amount / contrib.total) * 100,
                                            color:
                                              getFinancingInstrumentColor(type),
                                          }))}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="border border-slate-200 bg-white text-slate-800 shadow-lg"
                                  >
                                    <div className="space-y-1 text-xs">
                                      <p className="font-medium">
                                        {contrib.entity}
                                      </p>
                                      {typeEntries.map(([type, amount]) => (
                                        <div
                                          key={type}
                                          className="flex items-center justify-between gap-4"
                                        >
                                          <span className="flex items-center gap-1.5">
                                            <span
                                              className="h-2 w-2 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  getFinancingInstrumentColor(
                                                    type,
                                                  ),
                                              }}
                                            />
                                            {getFinancingInstrumentLabel(type)}
                                          </span>
                                          <span className="font-medium">
                                            {formatBudgetFixed(amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </FinancialPanelRankedRow>
                            );
                          })}

                          {!showAllEntities &&
                            entityContributions.length > 10 && (
                              <button
                                onClick={() => setShowAllEntities(true)}
                                className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                              >
                                Show all {entityContributions.length} entities
                              </button>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
          {assessmentContent}
          {SHOW_POOLED_FUNDS && revenueName && (
            <PooledFundsProfileSection
              kind="contributor"
              name={revenueName}
              year={selectedYear}
            />
          )}
        </div>
      </FinancialDetailPanel>
    </DetailDrawer>
  );
}
