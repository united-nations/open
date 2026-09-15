"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { useCallback, useEffect, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { SDG } from "@/lib/sdgs";
import { SidebarControls } from "@/components/SidebarControls";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import {
  loadUninfoSdgs,
  loadUninfoCountryIndex,
  UninfoSdgData,
} from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SHOW_UNINFO_SORT_CONTROLS } from "@/lib/featureFlags";
import { SortSelector, SortOption } from "@/components/ui/sort-selector";

const UNINFO_SORT_OPTIONS: SortOption[] = [
  { value: "available", label: "Available" },
  { value: "required", label: "Required" },
  { value: "spent", label: "Spent" },
  { value: "funding_gap", label: "Funding Gap" },
  { value: "spending_gap", label: "Spending Gap" },
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface SDGExpensesData {
  [sdgNumber: string]: {
    total: number;
    entities: { [entity: string]: number };
  };
}

interface SDGModalProps {
  sdg: SDG | null;
  onClose: () => void;
  color: string;
  entityExpenses?: { [entity: string]: number };
  initialYear: number;
}

export default function SDGModal({
  sdg,
  onClose,
  color,
  entityExpenses,
  initialYear,
}: SDGModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showAllEntities, setShowAllEntities] = useState(false);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = generateYearRange(
    yearRanges.sdgExpenses.min,
    yearRanges.sdgExpenses.max,
  ).reverse();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [yearEntityExpenses, setYearEntityExpenses] = useState<
    { [entity: string]: number } | undefined
  >(entityExpenses);
  const [loadingYear, setLoadingYear] = useState(false);

  // UNINFO Cooperation Framework data
  const [uninfoData, setUninfoData] = useState<UninfoSdgData | null>(null);
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [uninfoSort, setUninfoSort] = useState("available");

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(!!sdg);

  // Load UNINFO data and country names
  useEffect(() => {
    if (!sdg) return;
    Promise.all([loadUninfoSdgs(), loadUninfoCountryIndex()])
      .then(([sdgData, indexData]) => {
        setUninfoData(sdgData[sdg.number.toString()] || null);
        const names: Record<string, string> = {};
        for (const [iso3, data] of Object.entries(indexData))
          names[iso3] = data.name;
        setCountryNames(names);
      })
      .catch(() => setUninfoData(null));
  }, [sdg]);

  // Fetch SDG expenses when year changes
  useEffect(() => {
    if (!sdg || selectedYear === initialYear) {
      setYearEntityExpenses(entityExpenses);
      return;
    }
    setLoadingYear(true);
    fetch(`${basePath}/data/sdg-expenses-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: SDGExpensesData) => {
        const sdgData = data[sdg.number.toString()];
        setYearEntityExpenses(sdgData?.entities);
      })
      .catch(() => setYearEntityExpenses(undefined))
      .finally(() => setLoadingYear(false));
  }, [selectedYear, sdg, initialYear, entityExpenses]);

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

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isRightSwipe) handleClose();
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

  if (!sdg) return null;

  // Process entity expenses for display (use year-specific data)
  const sortedEntities = yearEntityExpenses
    ? Object.entries(yearEntityExpenses)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);

  const maxAmount =
    sortedEntities.length > 0
      ? Math.max(...sortedEntities.map((e) => e.amount))
      : 0;

  const totalExpenses = sortedEntities.reduce((sum, e) => sum + e.amount, 0);

  const modalTitleId = `sdg-modal-title-${sdg.number}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className={`h-full w-full overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <FinancialDetailPanel
          titleId={modalTitleId}
          className="sm:w-full"
          title={
            <span className="flex items-start gap-2">
              <span
                className="flex size-6 shrink-0 items-center justify-center font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {sdg.number}
              </span>
              <span className="min-w-0">{sdg.shortTitle}</span>
            </span>
          }
          subtitle={sdg.title}
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
              shareHash={`sdg=${sdg.number}`}
              onClose={handleClose}
              closeLabel="Close modal"
            />
          }
        >
          <div className="relative space-y-6">
            <DelayedChartLoading
              pending={loadingYear}
              requestKey={selectedYear}
            />
            {/* Entity Spending Breakdown */}
            {(sortedEntities.length > 0 || loadingYear) && (
              <div>
                <FinancialPanelHeading className="mb-3">
                  System-wide financials
                </FinancialPanelHeading>

                <div>
                  <FinancialPanelHeading subheading>
                    Total
                  </FinancialPanelHeading>
                  <div className="mt-0.5">
                    <div className="text-base font-semibold text-gray-700">
                      {formatBudget(totalExpenses)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <FinancialPanelHeading subheading>
                    Spending by entity
                  </FinancialPanelHeading>
                  <div className="mt-2 space-y-1.5">
                    {displayedEntities.map((entity) => {
                      const normalizedWidth = (entity.amount / maxAmount) * 100;
                      return (
                        <FinancialPanelRankedRow
                          key={entity.name}
                          label={entity.name}
                          value={formatBudget(entity.amount)}
                          onClick={() =>
                            navigateToSidebar("entity", entity.name)
                          }
                        >
                          <FinancialPanelBar
                            percent={normalizedWidth}
                            color={color}
                          />
                        </FinancialPanelRankedRow>
                      );
                    })}

                    {!showAllEntities && sortedEntities.length > 10 && (
                      <button
                        onClick={() => setShowAllEntities(true)}
                        className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
                      >
                        Show all {sortedEntities.length} entities
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* UNSDG Cooperation Framework Section */}
            {uninfoData && (
              <div className="border-t border-gray-200 pt-4">
                <FinancialPanelHeading className="mb-1">
                  UNSDG Cooperation Framework financials
                </FinancialPanelHeading>

                {selectedYear !== 2024 ? (
                  <p className="text-xs text-gray-500 italic">
                    Data only available for 2024.
                  </p>
                ) : (
                  <>
                    <p className="mb-4 text-xs text-gray-500">
                      Country-level programme data only, not representative of
                      total spending.
                    </p>

                    {/* Overall */}
                    <div>
                      <FinancialPanelHeading subheading>
                        Overall
                      </FinancialPanelHeading>
                      <div className="mt-2">
                        <UninfoFundingBar
                          required={uninfoData.totals.required}
                          available={uninfoData.totals.available}
                          spent={uninfoData.totals.spent}
                        />
                      </div>
                    </div>

                    {/* By Country */}
                    {Object.keys(uninfoData.countries).length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <FinancialPanelHeading subheading>
                            By country
                          </FinancialPanelHeading>
                          {SHOW_UNINFO_SORT_CONTROLS && (
                            <SortSelector
                              options={UNINFO_SORT_OPTIONS}
                              selected={uninfoSort}
                              onChange={setUninfoSort}
                            />
                          )}
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {(() => {
                            const entries = Object.entries(
                              uninfoData.countries,
                            );
                            const sorted = entries.sort((a, b) => {
                              const [, ma] = a,
                                [, mb] = b;
                              if (uninfoSort === "required")
                                return mb.required - ma.required;
                              if (uninfoSort === "available")
                                return mb.available - ma.available;
                              if (uninfoSort === "spent")
                                return mb.spent - ma.spent;
                              if (uninfoSort === "funding_gap")
                                return (
                                  mb.required -
                                  mb.available -
                                  (ma.required - ma.available)
                                );
                              if (uninfoSort === "spending_gap")
                                return (
                                  mb.available -
                                  mb.spent -
                                  (ma.available - ma.spent)
                                );
                              return 0;
                            });
                            const top10 = sorted.slice(0, 10);
                            const maxVal = Math.max(
                              ...top10.map(([, m]) => m.required),
                            );
                            return top10.map(([iso3, metrics]) => {
                              const barWidth =
                                (metrics.required / maxVal) * 100;
                              const availPct =
                                (metrics.available / metrics.required) * 100;
                              const spentPct =
                                (metrics.spent / metrics.required) * 100;
                              const name = countryNames[iso3] || iso3;
                              return (
                                <Tooltip key={iso3} delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() =>
                                        navigateToSidebar("country", iso3)
                                      }
                                      className="group flex w-full items-center gap-2 rounded hover:bg-gray-50"
                                    >
                                      <span
                                        className="w-20 flex-shrink-0 truncate text-left text-xs font-medium text-gray-700 group-hover:text-un-blue group-hover:underline"
                                        title={name}
                                      >
                                        {name}
                                      </span>
                                      <div className="flex flex-1 flex-col gap-px">
                                        <div
                                          className="relative h-2 overflow-hidden rounded-sm bg-gray-200"
                                          style={{ width: `${barWidth}%` }}
                                        >
                                          <div
                                            className="absolute inset-y-0 left-0 bg-un-blue/30"
                                            style={{ width: `${availPct}%` }}
                                          />
                                          <div
                                            className="absolute inset-y-0 left-0 bg-un-blue"
                                            style={{ width: `${spentPct}%` }}
                                          />
                                        </div>
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="border border-slate-200 bg-white p-3 text-slate-800 shadow-lg"
                                  >
                                    <p className="mb-2 text-xs font-medium">
                                      {name}
                                    </p>
                                    <UninfoFundingBar
                                      required={metrics.required}
                                      available={metrics.available}
                                      spent={metrics.spent}
                                      compact
                                    />
                                  </TooltipContent>
                                </Tooltip>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Targets and Indicators */}
            <div className="border-t border-gray-200 pt-4">
              <FinancialPanelHeading className="mb-3">
                Targets and indicators
              </FinancialPanelHeading>
              <div className="space-y-4">
                {sdg.targets.map((target) => (
                  <div key={target.number}>
                    <FinancialPanelHeading subheading className="mb-2">
                      Target {target.number}
                    </FinancialPanelHeading>
                    <p className="mb-3 text-xs leading-relaxed text-gray-700 sm:text-sm">
                      {target.description}
                    </p>
                    {target.indicators.length > 0 && (
                      <div className="ml-3 space-y-2">
                        {target.indicators.map((indicator) => (
                          <div
                            key={indicator.number}
                            className="flex items-start gap-2 text-xs sm:text-sm"
                          >
                            <span className="font-semibold whitespace-nowrap text-gray-900">
                              {indicator.number}
                            </span>
                            <span className="leading-relaxed text-gray-700">
                              {indicator.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FinancialDetailPanel>
      </div>
    </div>
  );
}
