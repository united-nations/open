"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { ExternalLink } from "lucide-react";
import { SidebarControls } from "@/components/SidebarControls";
import { useCallback, useEffect, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { YearSelector } from "@/components/ui/year-selector";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { loadUninfoCountry, UninfoCountryFull } from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import { UninfoProjectTable } from "@/components/UninfoProjectTable";
import { ResultsFramework } from "@/components/ResultsFramework";
import { SDG_COLORS, SDG_SHORT_TITLES } from "@/lib/sdgs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SortSelector, SortOption } from "@/components/ui/sort-selector";

const UNINFO_SORT_OPTIONS: SortOption[] = [
  { value: "sdg_number", label: "SDG Number" },
  { value: "available", label: "Available" },
  { value: "required", label: "Required" },
  { value: "spent", label: "Spent" },
  { value: "funding_gap", label: "Funding Gap" },
  { value: "spending_gap", label: "Spending Gap" },
];

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

const formatBudgetFixed = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  } else if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
};

export function CountrySidebar({ country, initialYear, onClose }: CountrySidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showAllEntities, setShowAllEntities] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = generateYearRange(yearRanges.countryExpenses.min, yearRanges.countryExpenses.max).reverse();
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
      .then(res => res.json())
      .then((data: CountryData[]) => {
        const found = data.find(c => c.iso3 === country.iso3);
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
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // Sort entities by amount descending (use year-specific data)
  const sortedEntities = Object.entries(yearCountry.entities).sort(
    (a, b) => b[1] - a[1]
  );
  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);
  const maxEntityTotal =
    sortedEntities.length > 0 ? sortedEntities[0][1] : 0;

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
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-300 bg-white px-6 pb-2 pt-4 sm:px-8 sm:pb-3 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 id={sidebarTitleId} className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-2xl">
                {country.name}
              </h2>
            </div>
            <SidebarControls
              shareHash={`country=${encodeURIComponent(country.iso3)}`}
              onClose={handleClose}
              closeLabel="Close sidebar"
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative space-y-6 px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
          <DelayedChartLoading pending={loadingYear} requestKey={selectedYear} />
          {/* Summary stats */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
                Summary
              </h3>
              <div className="flex items-center gap-2">
                <YearSelector years={availableYears} selected={selectedYear} onChange={setSelectedYear} />
                {loadingYear && <span className="text-xs text-gray-400">Loading...</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Total Spending
                </span>
                <div className="mt-0.5 text-xl font-bold text-gray-900">
                  {formatBudget(yearCountry.total)}
                </div>
              </div>
              <div>
                <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                  Entities Active
                </span>
                <div className="mt-0.5 text-lg font-semibold text-gray-700">
                  {sortedEntities.length}
                </div>
              </div>
            </div>
          </div>

          {/* Overall Spending (CEB) */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              Overall Spending
            </h3>
            <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
              By Entity
            </span>
            <div className="mt-2 space-y-2">
              {displayedEntities.map(([entity, amount]) => {
                const normalizedWidth = (amount / maxEntityTotal) * 100;
                return (
                  <div key={entity} className="flex items-center gap-2">
                    <button
                      onClick={() => navigateToSidebar("entity", entity)}
                      className="w-20 flex-shrink-0 truncate text-left text-xs font-medium text-gray-700 hover:text-un-blue hover:underline"
                      title={entity}
                    >
                      {entity}
                    </button>
                    <div className="flex flex-1 flex-col gap-px">
                      <div
                        className="h-2 rounded-sm bg-un-blue transition-all"
                        style={{ width: `${normalizedWidth}%` }}
                      />
                    </div>
                    <div className="w-20 flex-shrink-0 text-right text-xs text-gray-500">
                      {formatBudgetFixed(amount)}
                    </div>
                  </div>
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
            <h3 className="mb-1 text-lg font-normal uppercase tracking-wider text-gray-900 sm:text-xl">
              UNSDG Cooperation Framework
            </h3>
            
            {!uninfoData ? (
              <p className="text-xs text-gray-500 italic">
                No Cooperation Framework data available. Frameworks are agreements between the UN and programme countries — developed countries and some others are not included.
              </p>
            ) : selectedYear !== 2024 ? (
              <p className="text-xs text-gray-500 italic">Data only available for 2024.</p>
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Country-level programme data only, not representative of total spending. <a href="#methodology" className="underline hover:text-gray-700">Learn more.</a>
                </p>
                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
                  <a
                    href={`https://uninfo.org/v2/location/${uninfoData.workspace_id}/programming/analysis/sdgs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-un-blue hover:underline"
                  >
                    View on UNINFO <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={`https://unsdg.un.org/un-in-action/${country.name.toLowerCase().replace(/\s+/g, '-')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-un-blue hover:underline"
                  >
                    UNSDG country page <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                  
                  {/* Overall */}
                  <div>
                    <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                      Overall
                    </span>
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
                      <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                        By SDG
                      </span>
                      <SortSelector options={UNINFO_SORT_OPTIONS} selected={uninfoSort} onChange={setUninfoSort} />
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {(() => {
                        const entries = Object.entries(uninfoData.sdgs);
                        const sorted = entries.sort((a, b) => {
                          const [, ma] = a, [, mb] = b;
                          if (uninfoSort === "sdg_number") return parseInt(a[0]) - parseInt(b[0]);
                          if (uninfoSort === "required") return mb.required - ma.required;
                          if (uninfoSort === "available") return mb.available - ma.available;
                          if (uninfoSort === "spent") return mb.spent - ma.spent;
                          if (uninfoSort === "funding_gap") return (mb.required - mb.available) - (ma.required - ma.available);
                          if (uninfoSort === "spending_gap") return (mb.available - mb.spent) - (ma.available - ma.spent);
                          return parseInt(a[0]) - parseInt(b[0]);
                        });
                        const maxVal = Math.max(...entries.map(([, m]) => m.required));
                        return sorted.map(([sdgNum, metrics]) => {
                          const sdg = parseInt(sdgNum);
                          const barWidth = (metrics.required / maxVal) * 100;
                          const availPct = (metrics.available / metrics.required) * 100;
                          const spentPct = (metrics.spent / metrics.required) * 100;
                          return (
                            <Tooltip key={sdgNum} delayDuration={200}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => navigateToSidebar("sdg", sdg)}
                                  className="group flex w-full items-center gap-2 rounded hover:bg-gray-50"
                                >
                                  <span className="w-20 flex-shrink-0 truncate text-left text-xs text-gray-700 group-hover:text-un-blue group-hover:underline" title={SDG_SHORT_TITLES[sdg]}>
                                    {SDG_SHORT_TITLES[sdg]}
                                  </span>
                                  <div
                                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                                    style={{ backgroundColor: SDG_COLORS[sdg] }}
                                  >
                                    {sdg}
                                  </div>
                                  <div className="flex flex-1 flex-col gap-px">
                                    <div
                                      className="relative h-2 overflow-hidden rounded-sm bg-gray-200"
                                      style={{ width: `${barWidth}%` }}
                                    >
                                      <div className="absolute inset-y-0 left-0 opacity-30" style={{ width: `${availPct}%`, backgroundColor: SDG_COLORS[sdg] }} />
                                      <div className="absolute inset-y-0 left-0" style={{ width: `${spentPct}%`, backgroundColor: SDG_COLORS[sdg] }} />
                                    </div>
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="border border-slate-200 bg-white text-slate-800 shadow-lg p-3">
                                <p className="font-medium text-xs mb-2">SDG {sdg}: {SDG_SHORT_TITLES[sdg]}</p>
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

                  {/* Results Framework */}
                  {uninfoData.framework && uninfoData.framework.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                        Results Framework
                      </span>
                      <div className="mt-2">
                        <ResultsFramework framework={uninfoData.framework} />
                      </div>
                    </div>
                  )}

                  {/* Top Projects */}
                  {uninfoData.projects.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                        Top Projects
                      </span>
                      <div className="mt-2">
                        <UninfoProjectTable projects={uninfoData.projects} initialLimit={5} />
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
