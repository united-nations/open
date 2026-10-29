"use client";
import { revenueCoverage } from "@/lib/revenueCoverage";
import { useYearResource } from "@/hooks/useYearResource";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { useCallback, useEffect, useState } from "react";
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
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { navigateToSidebar } from "@/hooks/useDeepLink";
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
import { getFinancingInstrumentColor } from "@/lib/financingInstruments";
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
      other: number;
      assessed: number;
      voluntary_earmarked: number;
      voluntary_unearmarked: number;
    }[]
  >;
}

interface ContributorSidebarProps {
  contributor: Contributor | null;
  initialYear: number;
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
  initialYear,
  onClose,
}: ContributorSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showAllEntities, setShowAllEntities] = useState(false);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = generateYearRange(
    yearRanges.donors.min,
    yearRanges.donors.max,
  ).reverse();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const loadYear = useCallback(async (): Promise<Contributor | null> => {
    const data = await fetch(
      `${basePath}/data/donors-${selectedYear}.json`,
    ).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<Record<string, Contributor>>;
    });
    const found = contributor ? data[contributor.name] : null;
    return found && contributor ? { ...found, name: contributor.name } : null;
  }, [selectedYear, contributor]);
  const {
    value: yearContributor,
    loading: loadingYear,
    error: yearError,
  } = useYearResource<Contributor | null>(
    `${contributor?.name}-${selectedYear}`,
    contributor,
    !contributor?.name || selectedYear === initialYear,
    loadYear,
    null,
  );

  // Trends data for chart
  const [trendsData, setTrendsData] = useState<FinancingInstrumentDataPoint[]>(
    [],
  );

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(!!contributor);

  // Fetch contributor trends data on mount
  useEffect(() => {
    if (!contributor?.name) return;
    fetch(`${basePath}/data/contributor-trends.json`)
      .then((res) => res.json())
      .then((data: ContributorTrendsData) => {
        const contributorData = data.contributors[contributor.name];
        if (contributorData) {
          setTrendsData(
            contributorData.map((item) =>
              contributorFinancingPoint(
                item,
                !(
                  revenueCoverage(item.year)?.government === false &&
                  contributor.category === "Government"
                ),
              ),
            ),
          );
        }
      })
      .catch(() => setTrendsData([]));
  }, [contributor?.name, contributor?.category]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) handleClose();
  };

  useEffect(() => {
    const rootStyle = document.documentElement.style;
    const previousOverflow = rootStyle.overflow;
    const previousGutter = rootStyle.scrollbarGutter;
    rootStyle.overflow = "hidden";
    rootStyle.scrollbarGutter = "auto";
    return () => {
      rootStyle.overflow = previousOverflow;
      rootStyle.scrollbarGutter = previousGutter;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!contributor) return null;

  // Use year-specific data when available
  const displayContributor = yearContributor || contributor;
  const totalContributions = getTotalContributions(
    displayContributor.contributions,
  );
  const breakdown = getContributionBreakdown(displayContributor.contributions);
  const breakdownEntries = Object.entries(breakdown).sort(
    (a, b) => getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0]),
  );

  const entityContributions = Object.entries(displayContributor.contributions)
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={sidebarTitleId}
        className={`h-full w-full overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <FinancialDetailPanel
          title={contributor.name}
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
              shareHash={`donor=${encodeURIComponent(contributor.name)}`}
              onClose={handleClose}
              closeLabel="Close sidebar"
            />
          }
        >
          <div className="relative space-y-6">
            {yearContributor && (
              <p className="text-sm text-gray-600">
                {contributorOriginLabel(displayContributor.record_kind)}
                {displayContributor.record_kind === "calculated_balance" &&
                  ". Calculated from reported control totals minus the available contributor detail; signed differences are retained."}
              </p>
            )}
            {yearContributor &&
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
                          displayContributor.categoryContributions?.[
                            category
                          ] ?? {},
                        ),
                      )}
                    />
                  ))}
                </div>
              )}
            {yearContributor && displayContributor.financingIncomplete && (
              <section
                className="space-y-3 rounded border border-gray-200 p-3 text-sm"
                data-unresolved-financing
              >
                <h3 className="font-semibold">
                  Source records with unresolved financing
                </h3>
                <p>
                  These reported amounts have historical financing codes whose
                  meaning cannot be verified. They are separate from the
                  reconciled four-type amounts below and must not be added to
                  system totals. Gaps in the financing trend indicate this
                  incomplete breakdown.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="p-1">Recipient</th>
                        <th className="p-1">CEB code</th>
                        <th className="p-1 text-right">Source amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayContributor.unresolvedFinancingRecords?.map(
                        (record, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-1">{record.entity}</td>
                            <td className="p-1">{record.sourceCode}</td>
                            <td className="p-1 text-right tabular-nums">
                              {formatBudget(record.amount)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {revenueCoverage(selectedYear)?.note && (
              <p className="text-sm text-gray-600">
                {revenueCoverage(selectedYear)?.note}
              </p>
            )}
            <DelayedChartLoading
              pending={loadingYear}
              requestKey={selectedYear}
            />
            {!yearContributor && selectedYear !== initialYear ? (
              <>
                <p className="text-sm text-gray-500 italic">
                  {loadingYear
                    ? "Loading…"
                    : yearError
                      ? `Data could not be loaded for ${selectedYear}.`
                      : `No data available for ${contributor.name} in ${selectedYear}.`}
                </p>
              </>
            ) : (
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
                    label={
                      displayContributor.financingIncomplete
                        ? "Revenue with identified financing"
                        : "Revenue"
                    }
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
                                    navigateToSidebar("entity", contrib.entity)
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
                                                getFinancingInstrumentColor(
                                                  type,
                                                ),
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
                                              {type}
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
          </div>
        </FinancialDetailPanel>
      </div>
    </div>
  );
}
