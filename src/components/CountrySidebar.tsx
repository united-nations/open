"use client";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { ExternalLink } from "lucide-react";
import { SidebarControls } from "@/components/SidebarControls";
import { useCallback, useEffect, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
  FinancialPanelGoalBadge,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { loadUninfoCountry, UninfoCountryFull } from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import { UninfoProjectTable } from "@/components/UninfoProjectTable";
import { ResultsFramework } from "@/components/ResultsFramework";
import { SDG_COLORS, SDG_SHORT_TITLES } from "@/lib/sdgs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SHOW_UNINFO_SORT_CONTROLS } from "@/lib/featureFlags";
import { SortSelector, SortOption } from "@/components/ui/sort-selector";

const UNINFO_SORT_OPTIONS: SortOption[] = [
  { value: "sdg_number", label: "SDG Number" },
  { value: "available", label: "Available" },
  { value: "required", label: "Required" },
  { value: "spent", label: "Spent" },
  { value: "funding_gap", label: "Funding Gap" },
  { value: "spending_gap", label: "Spending Gap" },
];

// Cumulative display levels; retain all existing content for now.
type CooperationFrameworkLevel =
  | "links"
  | "financials"
  | "results"
  | "projects";
const COOPERATION_FRAMEWORK_LEVEL: CooperationFrameworkLevel = "projects";
const COOPERATION_FRAMEWORK_VISIBILITY: Record<
  CooperationFrameworkLevel,
  { financials: boolean; results: boolean; projects: boolean }
> = {
  links: { financials: false, results: false, projects: false },
  financials: { financials: true, results: false, projects: false },
  results: { financials: true, results: true, projects: false },
  projects: { financials: true, results: true, projects: true },
};
const cooperationFrameworkVisibility =
  COOPERATION_FRAMEWORK_VISIBILITY[COOPERATION_FRAMEWORK_LEVEL];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface CountryData {
  iso3: string;
  name: string;
  total: number;
  entities: Record<string, number>;
}

interface CountrySidebarProps {
  country: CountryData;
  initialYear: number;
  onClose: () => void;
}

const formatBudgetFixed = sharedFormatBudget;

export function CountrySidebar({
  country,
  initialYear,
  onClose,
}: CountrySidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showAllEntities, setShowAllEntities] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = generateYearRange(
    yearRanges.countryExpenses.min,
    yearRanges.countryExpenses.max,
  ).reverse();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [yearCountry, setYearCountry] = useState<CountryData>(country);
  const [loadingYear, setLoadingYear] = useState(false);

  // UNINFO Cooperation Framework data
  const [uninfoData, setUninfoData] = useState<UninfoCountryFull | null>(null);
  const [uninfoSort, setUninfoSort] = useState("sdg_number");

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(true);

  // Load UNINFO data (single file with SDGs + projects)
  useEffect(() => {
    loadUninfoCountry(country.iso3)
      .then(setUninfoData)
      .catch(() => setUninfoData(null));
  }, [country.iso3]);

  // Fetch country data when year changes
  useEffect(() => {
    if (selectedYear === initialYear) {
      setYearCountry(country);
      return;
    }
    setLoadingYear(true);
    fetch(`${basePath}/data/country-expenses-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: CountryData[]) => {
        const found = data.find((c) => c.iso3 === country.iso3);
        setYearCountry(found || { ...country, total: 0, entities: {} });
      })
      .catch(() => setYearCountry({ ...country, total: 0, entities: {} }))
      .finally(() => setLoadingYear(false));
  }, [selectedYear, country, initialYear]);

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

  // Sort entities by amount descending (use year-specific data)
  const sortedEntities = Object.entries(yearCountry.entities).sort(
    (a, b) => b[1] - a[1],
  );
  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);
  const maxEntityTotal = sortedEntities.length > 0 ? sortedEntities[0][1] : 0;

  const sidebarTitleId = `country-sidebar-title`;

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
          title={country.name}
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
              shareHash={`country=${encodeURIComponent(country.iso3)}`}
              onClose={handleClose}
              closeLabel="Close sidebar"
            />
          }
        >
          <div className="relative space-y-6">
            <DelayedChartLoading
              pending={loadingYear}
              requestKey={selectedYear}
            />
            {/* Summary stats */}
            <div>
              <FinancialPanelHeading className="mb-3">
                System-wide financials
              </FinancialPanelHeading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-normal tracking-wide text-gray-600 uppercase">
                    Total Spending
                  </span>
                  <div className="mt-0.5 text-xl font-bold text-gray-900">
                    {formatBudget(yearCountry.total)}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-normal tracking-wide text-gray-600 uppercase">
                    Entities Active
                  </span>
                  <div className="mt-0.5 text-lg font-semibold text-gray-700">
                    {sortedEntities.length}
                  </div>
                </div>
              </div>
              <FinancialPanelHeading subheading className="mt-4">
                Spending by entity
              </FinancialPanelHeading>
              <div className="mt-2 space-y-2">
                {displayedEntities.map(([entity, amount]) => {
                  const normalizedWidth = (amount / maxEntityTotal) * 100;
                  return (
                    <FinancialPanelRankedRow
                      key={entity}
                      label={entity}
                      value={formatBudgetFixed(amount)}
                      onClick={() => navigateToSidebar("entity", entity)}
                    >
                      <FinancialPanelBar
                        percent={normalizedWidth}
                        color="var(--color-un-blue)"
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

            {/* UN Cooperation Framework Section */}
            <div className="border-t border-gray-200 pt-6">
              <FinancialPanelHeading className="mb-1">
                UNSDG Cooperation Framework financials
              </FinancialPanelHeading>

              {!uninfoData ? (
                <p className="text-xs text-gray-500 italic">
                  No Cooperation Framework data available. Frameworks are
                  agreements between the UN and programme countries — developed
                  countries and some others are not included.
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Country-level programme data only, not representative of
                    total spending.
                  </p>
                  <div className="mt-2 mb-4 flex flex-wrap gap-x-4 gap-y-2">
                    <a
                      href={`https://uninfo.org/v2/location/${uninfoData.workspace_id}/programming/analysis/sdgs`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-un-blue hover:underline"
                    >
                      View on UNINFO <ExternalLink className="h-3 w-3" />
                    </a>
                    <a
                      href={`https://unsdg.un.org/un-in-action/${country.name.toLowerCase().replace(/\s+/g, "-")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-un-blue hover:underline"
                    >
                      UNSDG country page <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {selectedYear !== 2024 &&
                    cooperationFrameworkVisibility.financials && (
                      <p className="text-xs text-gray-500 italic">
                        Data only available for 2024.
                      </p>
                    )}
                  {selectedYear === 2024 &&
                    cooperationFrameworkVisibility.financials && (
                      <>
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

                        {/* By SDG */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <FinancialPanelHeading subheading>
                              By SDG
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
                              const entries = Object.entries(uninfoData.sdgs);
                              const sorted = entries.sort((a, b) => {
                                const [, ma] = a,
                                  [, mb] = b;
                                if (uninfoSort === "sdg_number")
                                  return parseInt(a[0]) - parseInt(b[0]);
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
                                return parseInt(a[0]) - parseInt(b[0]);
                              });
                              const maxVal = Math.max(
                                ...entries.map(([, m]) => m.required),
                              );
                              return sorted.map(([sdgNum, metrics]) => {
                                const sdg = parseInt(sdgNum);
                                const barWidth =
                                  (metrics.required / maxVal) * 100;
                                const availPct =
                                  (metrics.available / metrics.required) * 100;
                                const spentPct =
                                  (metrics.spent / metrics.required) * 100;
                                return (
                                  <Tooltip key={sdgNum} delayDuration={200}>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          navigateToSidebar("sdg", sdg)
                                        }
                                        className="group flex w-full items-center gap-2 rounded hover:bg-gray-50"
                                      >
                                        <span
                                          className="w-20 flex-shrink-0 truncate text-left text-xs text-gray-700 group-hover:text-un-blue group-hover:underline"
                                          title={SDG_SHORT_TITLES[sdg]}
                                        >
                                          {SDG_SHORT_TITLES[sdg]}
                                        </span>
                                        <FinancialPanelGoalBadge
                                          label={String(sdg)}
                                          color={SDG_COLORS[sdg]}
                                        />
                                        <div className="flex flex-1 flex-col gap-px">
                                          <div
                                            className="relative h-2 overflow-hidden rounded-sm bg-gray-200"
                                            style={{ width: `${barWidth}%` }}
                                          >
                                            <div
                                              className="absolute inset-y-0 left-0 opacity-30"
                                              style={{
                                                width: `${availPct}%`,
                                                backgroundColor:
                                                  SDG_COLORS[sdg],
                                              }}
                                            />
                                            <div
                                              className="absolute inset-y-0 left-0"
                                              style={{
                                                width: `${spentPct}%`,
                                                backgroundColor:
                                                  SDG_COLORS[sdg],
                                              }}
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
                                        SDG {sdg}: {SDG_SHORT_TITLES[sdg]}
                                      </p>
                                      <UninfoFundingBar
                                        required={metrics.required}
                                        available={metrics.available}
                                        spent={metrics.spent}
                                        color={SDG_COLORS[sdg]}
                                        compact
                                      />
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  {/* Results Framework */}
                  {selectedYear === 2024 &&
                    cooperationFrameworkVisibility.results &&
                    uninfoData.framework &&
                    uninfoData.framework.length > 0 && (
                      <div className="mt-4">
                        <FinancialPanelHeading subheading>
                          Results Framework
                        </FinancialPanelHeading>
                        <div className="mt-2">
                          <ResultsFramework framework={uninfoData.framework} />
                        </div>
                      </div>
                    )}

                  {/* Top Projects */}
                  {selectedYear === 2024 &&
                    cooperationFrameworkVisibility.projects &&
                    uninfoData.projects.length > 0 && (
                      <div className="mt-4">
                        <FinancialPanelHeading subheading>
                          Top Projects
                        </FinancialPanelHeading>
                        <div className="mt-2">
                          <UninfoProjectTable
                            projects={uninfoData.projects}
                            initialLimit={5}
                          />
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </FinancialDetailPanel>
      </div>
    </div>
  );
}
