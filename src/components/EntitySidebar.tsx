"use client";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SidebarControls } from "@/components/SidebarControls";
import { useCallback, useEffect, useState } from "react";
import {
  Entity,
  Impact,
  EntityRevenue,
  CountryExpense,
  EntitySpendingBreakdown,
} from "@/types";
import { formatBudget } from "@/lib/entities";
import {
  getContributionTypeBgColor,
  getContributionTypeOrder,
} from "@/lib/contributors";
import { FinancingInstrumentLabel } from "@/components/FinancingInstrumentLabel";
import { getFinancingInstrumentColor } from "@/lib/financingInstruments";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import {
  FinancialPanelHeading,
  FinancialPanelBar,
  FinancialPanelRankedRow,
  FinancialPanelGoalBadge,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import {
  EntityTrendChart,
  EntityTrendDataPoint,
} from "@/components/charts/EntityTrendChart";
import {
  FinancingInstrumentChart,
  FinancingInstrumentDataPoint,
} from "@/components/charts/FinancingInstrumentChart";
import { SDG_COLORS, SDG_SHORT_TITLES } from "@/lib/sdgs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EntityTrendsData {
  meta: { years: number[] };
  entities: Record<
    string,
    { year: number; revenue: number | null; expenses: number | null }[]
  >;
}

interface EntitySidebarProps {
  entity: Entity | null;
  spending: number;
  revenue: EntityRevenue | null;
  initialYear: number;
  initialDataComplete?: boolean;
  onClose: () => void;
}

const SHOW_ENTITY_IMPACTS = false;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const formatBudgetFixed = sharedFormatBudget;

export function EntitySidebar({
  entity,
  spending,
  revenue,
  initialYear,
  initialDataComplete = true,
  onClose,
}: EntitySidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loadingImpacts, setLoadingImpacts] = useState(true);
  const [showAllDonors, setShowAllDonors] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [spendingBreakdown, setSpendingBreakdown] =
    useState<EntitySpendingBreakdown | null>(null);
  const [loadingSpending, setLoadingSpending] = useState(false);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = generateYearRange(
    Math.min(yearRanges.entitySpending.min, yearRanges.entityRevenue.min),
    Math.max(yearRanges.entitySpending.max, yearRanges.entityRevenue.max),
  ).reverse();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [yearSpending, setYearSpending] = useState<number>(spending);
  const [yearRevenue, setYearRevenue] = useState<EntityRevenue | null>(revenue);
  const [loadingYear, setLoadingYear] = useState(false);

  // Trend data for charts
  const [trendData, setTrendData] = useState<EntityTrendDataPoint[]>([]);
  const [financingTrendData, setFinancingTrendData] = useState<
    FinancingInstrumentDataPoint[]
  >([]);

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(!!entity);

  // Fetch entity trends data on mount
  useEffect(() => {
    if (!entity?.entity) return;
    fetch(`${basePath}/data/entity-trends.json`)
      .then((res) => res.json())
      .then((data: EntityTrendsData) => {
        const entityData = data.entities[entity.entity];
        if (entityData) {
          setTrendData(
            entityData.map((item) => ({
              year: item.year.toString(),
              revenue: item.revenue,
              expenses: item.expenses,
            })),
          );
        }
      })
      .catch(() => setTrendData([]));
  }, [entity?.entity]);

  // Fetch financing instrument timeline data (from multiple entity-revenue files)
  useEffect(() => {
    if (!entity?.entity) return;
    const years = generateYearRange(
      yearRanges.entityRevenue.min,
      yearRanges.entityRevenue.max,
    );
    Promise.all(
      years.map((year) =>
        fetch(`${basePath}/data/entity-revenue-${year}.json`)
          .then((r) => r.json())
          .then((data) => ({ year, data: data[entity.entity] }))
          .catch(() => ({ year, data: null })),
      ),
    ).then((results) => {
      const fiData: FinancingInstrumentDataPoint[] = results
        .filter((r) => r.data?.by_type)
        .map((r) => ({
          year: r.year.toString(),
          Assessed: r.data.by_type["Assessed"] || 0,
          "Voluntary un-earmarked":
            r.data.by_type["Voluntary un-earmarked"] || 0,
          "Voluntary earmarked": r.data.by_type["Voluntary earmarked"] || 0,
          Other: r.data.by_type["Other"] || 0,
        }));
      setFinancingTrendData(fiData);
    });
  }, [
    entity?.entity,
    yearRanges.entityRevenue.min,
    yearRanges.entityRevenue.max,
  ]);

  // Fetch data when year changes
  useEffect(() => {
    if (
      !entity?.entity ||
      (selectedYear === initialYear && initialDataComplete)
    ) {
      setYearSpending(spending);
      setYearRevenue(revenue);
      return;
    }
    let cancelled = false;
    setLoadingYear(true);
    Promise.all([
      fetch(`${basePath}/data/entity-revenue-${selectedYear}.json`)
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`${basePath}/data/entity-spending-${selectedYear}.json`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([revenueData, spendingData]) => {
        if (cancelled) return;
        const entityRevenue = revenueData[entity.entity] || null;
        setYearRevenue(entityRevenue);
        const spendingEntry = spendingData.find(
          (e: { entity: string; amount: number }) => e.entity === entity.entity,
        );
        setYearSpending(spendingEntry?.amount || 0);
      })
      .finally(() => {
        if (!cancelled) setLoadingYear(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedYear,
    entity?.entity,
    initialYear,
    initialDataComplete,
    spending,
    revenue,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!SHOW_ENTITY_IMPACTS || !entity?.entity) {
      setImpacts([]);
      setLoadingImpacts(false);
      return;
    }

    setLoadingImpacts(true);
    fetch(`${basePath}/data/impact.json`)
      .then((res) => res.json())
      .then((data: Impact[]) => {
        const entityImpacts = data.filter(
          (impact) => impact.entity === entity.entity,
        );
        setImpacts(entityImpacts);
        setLoadingImpacts(false);
      })
      .catch((err) => {
        console.error("Failed to load impacts:", err);
        setImpacts([]);
        setLoadingImpacts(false);
      });
  }, [entity?.entity]);

  // Fetch spending breakdown by country and SDG
  useEffect(() => {
    if (!entity?.entity) {
      setSpendingBreakdown(null);
      return;
    }

    setLoadingSpending(true);
    Promise.all([
      fetch(`${basePath}/data/country-expenses-${selectedYear}.json`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${basePath}/data/sdg-expenses-${selectedYear}.json`)
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(
        ([countryData, sdgData]: [
          CountryExpense[],
          Record<string, { total: number; entities: Record<string, number> }>,
        ]) => {
          const byCountry = countryData
            .filter((country) => country.entities[entity.entity])
            .map((country) => ({
              name: country.name,
              iso3: country.iso3,
              amount: country.entities[entity.entity],
            }))
            .sort((a, b) => b.amount - a.amount);

          const bySDG = Object.entries(sdgData)
            .filter(([_, data]) => data.entities[entity.entity])
            .map(([sdg, data]) => ({
              sdg: parseInt(sdg),
              amount: data.entities[entity.entity],
            }))
            .sort((a, b) => a.sdg - b.sdg);

          setSpendingBreakdown({ byCountry, bySDG });
        },
      )
      .finally(() => setLoadingSpending(false));
  }, [entity?.entity, selectedYear]);

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

  if (!entity) return null;

  const description = entity.entity_description || entity.entity_long || "";
  const budgetLink = entity.budget_financial_reporting_link;
  const internalBudgetLink =
    budgetLink?.startsWith("/") && !budgetLink.startsWith("//")
      ? budgetLink
      : null;

  // Process revenue breakdown by financing instrument (use year-specific data)
  const revenueByType = yearRevenue?.by_type
    ? Object.entries(yearRevenue.by_type).sort(
        (a, b) =>
          getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0]),
      )
    : [];

  // Process revenue breakdown by donor
  const donorContributions = yearRevenue?.by_donor || [];
  const displayedDonors = showAllDonors
    ? donorContributions
    : donorContributions.slice(0, 10);
  const maxDonorTotal =
    donorContributions.length > 0
      ? Math.max(...donorContributions.map((d) => d.total))
      : 0;

  const sidebarTitleId = `entity-sidebar-title`;

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
          title={entity.entity}
          subtitle={entity.entity_long}
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
              shareHash={`entity=${encodeURIComponent(entity.entity || "")}`}
              onClose={handleClose}
              closeLabel="Close sidebar"
            />
          }
        >
          {/* Content */}
          <div className="relative space-y-6">
            <DelayedChartLoading
              pending={loadingYear}
              requestKey={selectedYear}
            />
            {/* Overview Section */}
            <div>
              {description && (
                <p className="text-sm leading-relaxed text-gray-700">
                  {description}
                </p>
              )}

              {/* Budget or System Chart link */}
              <div className="mt-4">
                {internalBudgetLink ? (
                  <Link
                    href={internalBudgetLink}
                    className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                  >
                    View budget
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <a
                    href={`https://systemchart.un.org/?entity=${entity.entity?.toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                  >
                    View in UN System Chart
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Financials Section */}
            <div>
              {/* Total Spending */}
              <div>
                <span className="text-sm font-normal tracking-wide text-gray-600 uppercase">
                  Total Spending
                </span>
                <div className="mt-0.5">
                  <div className="text-base font-semibold text-gray-700">
                    {yearSpending > 0 ? formatBudget(yearSpending) : "N/A"}
                  </div>
                </div>
              </div>

              {/* Total Funding */}
              <div className="mt-3">
                <span className="text-sm font-normal tracking-wide text-gray-600 uppercase">
                  Total Funding
                </span>
                <div className="mt-0.5">
                  {yearRevenue ? (
                    <div className="text-base font-semibold text-gray-700">
                      {formatBudget(yearRevenue.total)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Funding data not available at sub-entity level
                    </div>
                  )}
                </div>
              </div>

              {/* Funding by Financing Instrument */}
              {(yearRevenue && revenueByType.length > 0) ||
              financingTrendData.length > 0 ? (
                <div className="mt-4">
                  <FinancialPanelHeading subheading>
                    Funding by Financing Instrument
                  </FinancialPanelHeading>
                  {yearRevenue && revenueByType.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {revenueByType.map(([type, amount]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between gap-2"
                        >
                          <FinancingInstrumentLabel type={type} />
                          <span className="text-sm font-semibold text-gray-700">
                            {formatBudget(amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {financingTrendData.length > 0 && (
                    <div className="mt-3">
                      <FinancingInstrumentChart
                        data={financingTrendData}
                        compact
                        showLegend={false}
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Revenue vs Expenses Trend */}
              {trendData.length > 0 && (
                <div className="mt-4">
                  <FinancialPanelHeading subheading>
                    Revenue vs Expenses
                  </FinancialPanelHeading>
                  <div className="mt-1 flex gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-un-blue" />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-faded-jade" />
                      Expenses
                    </span>
                  </div>
                  <div className="mt-2">
                    <EntityTrendChart data={trendData} compact />
                  </div>
                </div>
              )}

              {/* Funding by contributor */}
              {yearRevenue && donorContributions.length > 0 && (
                <div className="mt-4">
                  <FinancialPanelHeading subheading>
                    Funding by contributor
                  </FinancialPanelHeading>
                  <div className="mt-2 space-y-1.5">
                    {displayedDonors.map((contrib) => {
                      const typeEntries = Object.entries(contrib)
                        .filter(([key]) => key !== "donor" && key !== "total")
                        .sort(
                          (a, b) =>
                            getContributionTypeOrder(a[0]) -
                            getContributionTypeOrder(b[0]),
                        ) as [string, number][];
                      const normalizedWidth =
                        (contrib.total / maxDonorTotal) * 100;

                      return (
                        <FinancialPanelRankedRow
                          key={contrib.donor}
                          title={contrib.donor}
                          label={contrib.donor
                            .replace(
                              "United Kingdom of Great Britain and Northern Ireland",
                              "UK",
                            )
                            .replace("United States of America", "USA")}
                          value={formatBudgetFixed(contrib.total)}
                          onClick={() =>
                            navigateToSidebar("donor", contrib.donor)
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
                                      percent: (amount / contrib.total) * 100,
                                      color: getFinancingInstrumentColor(type),
                                    }))}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="border border-slate-200 bg-white text-slate-800 shadow-lg"
                            >
                              <div className="space-y-1 text-xs">
                                <p className="font-medium">{contrib.donor}</p>
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
                                            getFinancingInstrumentColor(type),
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

                    {!showAllDonors && donorContributions.length > 10 && (
                      <button
                        onClick={() => setShowAllDonors(true)}
                        className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                      >
                        Show all {donorContributions.length} contributors
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Spending by Country Section */}
            {spendingBreakdown && spendingBreakdown.byCountry.length > 0 && (
              <div className="mt-4">
                <FinancialPanelHeading subheading>
                  Spending by Country
                </FinancialPanelHeading>
                {loadingSpending ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Loading spending data...
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {(showAllCountries
                      ? spendingBreakdown.byCountry
                      : spendingBreakdown.byCountry.slice(0, 10)
                    ).map((country) => {
                      const maxAmount =
                        spendingBreakdown.byCountry[0]?.amount || 1;
                      const normalizedWidth =
                        (country.amount / maxAmount) * 100;

                      return (
                        <FinancialPanelRankedRow
                          key={country.iso3}
                          label={country.name}
                          value={formatBudgetFixed(country.amount)}
                          onClick={() =>
                            navigateToSidebar("country", country.iso3)
                          }
                        >
                          <FinancialPanelBar
                            percent={normalizedWidth}
                            color="var(--color-un-blue)"
                          />
                        </FinancialPanelRankedRow>
                      );
                    })}

                    {!showAllCountries &&
                      spendingBreakdown.byCountry.length > 10 && (
                        <button
                          onClick={() => setShowAllCountries(true)}
                          className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                        >
                          Show all {spendingBreakdown.byCountry.length}{" "}
                          countries
                        </button>
                      )}
                  </div>
                )}
              </div>
            )}

            {/* Spending by SDG Section */}
            {spendingBreakdown && spendingBreakdown.bySDG.length > 0 && (
              <div className="mt-4">
                <FinancialPanelHeading subheading>
                  Spending by SDG
                </FinancialPanelHeading>
                {loadingSpending ? (
                  <p className="mt-2 text-sm text-gray-500">
                    Loading spending data...
                  </p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {spendingBreakdown.bySDG.map((item) => {
                      const maxAmount = Math.max(
                        ...spendingBreakdown.bySDG.map((s) => s.amount),
                      );
                      const normalizedWidth = (item.amount / maxAmount) * 100;

                      return (
                        <FinancialPanelRankedRow
                          key={item.sdg}
                          label={SDG_SHORT_TITLES[item.sdg]}
                          value={formatBudgetFixed(item.amount)}
                          onClick={() => navigateToSidebar("sdg", item.sdg)}
                          badge={
                            <FinancialPanelGoalBadge
                              label={String(item.sdg)}
                              color={SDG_COLORS[item.sdg]}
                            />
                          }
                        >
                          <FinancialPanelBar
                            percent={normalizedWidth}
                            color={SDG_COLORS[item.sdg]}
                          />
                        </FinancialPanelRankedRow>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Retained for a later, explicitly enabled impact view. */}
            {SHOW_ENTITY_IMPACTS && (
              <div>
                <FinancialPanelHeading className="mb-3">
                  Impact
                </FinancialPanelHeading>
                {loadingImpacts ? (
                  <p className="text-sm text-gray-500">Loading impacts...</p>
                ) : impacts.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {impacts.map((impact) => (
                        <div
                          key={impact.id}
                          className="flex items-stretch gap-3 rounded-md bg-gray-50 p-3"
                        >
                          <div className="w-1.5 flex-shrink-0 rounded-sm bg-un-blue" />
                          <p className="text-sm leading-relaxed text-gray-700">
                            {impact.impact}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                      Impacts extracted from 2024 annual report.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No impact data available for this entity.
                  </p>
                )}
              </div>
            )}
          </div>
        </FinancialDetailPanel>
      </div>
    </div>
  );
}
