"use client";
import { useYearResource } from "@/hooks/useYearResource";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { ExternalLink } from "lucide-react";
import { SidebarControls } from "@/components/SidebarControls";
import { useCallback, useEffect, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelTotalRow,
  FinancialPanelRankedRow,
  FinancialPanelBar,
  FinancialPanelGoalBadge,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useYearRanges } from "@/lib/useYearRanges";
import { loadUninfoCountry, loadYearData, UninfoCountryFull } from "@/lib/data";
import { UninfoFundingBar } from "@/components/UninfoFundingBar";
import { UninfoProjectTable } from "@/components/UninfoProjectTable";
import { ResultsFramework } from "@/components/ResultsFramework";
import { SDG_COLORS, SDG_SHORT_TITLES } from "@/lib/sdgs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SHOW_UNINFO, SHOW_UNINFO_SORT_CONTROLS } from "@/lib/featureFlags";
import { SortSelector, SortOption } from "@/components/ui/sort-selector";

const UNINFO_SORT_OPTIONS: SortOption[] = [
  { value: "sdg_number", label: "SDG Number" },
  { value: "available", label: "Available resources" },
  { value: "required", label: "Required resources" },
  { value: "spent", label: "Expenditure" },
  { value: "funding_gap", label: "Funding gap" },
  { value: "spending_gap", label: "Available resources less expenditure" },
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
  const [showAllEntities, setShowAllEntities] = useState(false);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = [...yearRanges.countryExpenses.years].sort(
    (a, b) => b - a,
  );
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const loadYear = useCallback(async (): Promise<CountryData | null> => {
    const data = await loadYearData<CountryData[]>(
      "country-expenses",
      selectedYear,
    );
    return data.find((item) => item.iso3 === country.iso3) ?? null;
  }, [selectedYear, country.iso3]);
  const {
    value: yearCountry,
    loading: loadingYear,
    error: yearError,
  } = useYearResource<CountryData | null>(
    `${country.iso3}-${selectedYear}`,
    country,
    selectedYear === initialYear,
    loadYear,
    null,
  );

  // UNINFO Cooperation Framework data
  const [uninfoResult, setUninfoResult] = useState<{
    iso3: string;
    data: UninfoCountryFull | null;
  } | null>(null);
  const uninfoData =
    uninfoResult?.iso3 === country.iso3 ? uninfoResult.data : null;
  const [uninfoSort, setUninfoSort] = useState("sdg_number");

  // Load UNINFO data (single file with SDGs + projects)
  useEffect(() => {
    if (!SHOW_UNINFO) return;
    let cancelled = false;
    loadUninfoCountry(country.iso3)
      .then((data) => {
        if (!cancelled) setUninfoResult({ iso3: country.iso3, data });
      })
      .catch(() => {
        if (!cancelled) setUninfoResult({ iso3: country.iso3, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [country.iso3]);

  // Sort entities by amount descending (use year-specific data)
  const sortedEntities = Object.entries(yearCountry?.entities ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);
  const maxEntityTotal = sortedEntities.length > 0 ? sortedEntities[0][1] : 0;

  const sidebarTitleId = `country-sidebar-title`;

  return (
    <DetailDrawer
      titleId={sidebarTitleId}
      onClose={onClose}
      swipeToClose
      className="overflow-hidden sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px]"
    >
      <FinancialDetailPanel
        title={<DrawerTitle>{country.name}</DrawerTitle>}
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
            onClose={onClose}
            closeLabel="Close sidebar"
          />
        }
      >
        <div className="relative space-y-6">
          <DelayedChartLoading
            pending={loadingYear}
            requestKey={selectedYear}
          />
          {yearError && (
            <p role="status" className="text-sm text-gray-500">
              Data could not be loaded for {selectedYear}.
            </p>
          )}
          {/* Summary stats */}
          <div>
            <FinancialPanelHeading className="mb-3">
              System-wide financials
            </FinancialPanelHeading>
            <div className="space-y-3">
              <FinancialPanelTotalRow
                label="Total expenditure"
                value={
                  loadingYear
                    ? "Loading…"
                    : yearError || yearCountry === null
                      ? "Unavailable"
                      : formatBudget(yearCountry.total)
                }
              />
              <FinancialPanelTotalRow
                label="Entities active"
                value={
                  loadingYear || yearError || yearCountry === null
                    ? "—"
                    : sortedEntities.length
                }
              />
            </div>
            {!loadingYear && !yearError && yearCountry === null && (
              <p className="mt-2 text-sm text-gray-500" role="status">
                Expenditure data unavailable for this country and year.
              </p>
            )}
            <FinancialPanelHeading subheading className="mt-4">
              Expenditure by entity
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
          {SHOW_UNINFO && (
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
                    {uninfoData.geographic_scope === "workspace"
                      ? `Shared workspace totals for ${uninfoData.workspace_countries.join(", ")}; these are not allocations to this country.`
                      : "Country programme data only, not representative of total expenditure."}
                    {uninfoData.year === null
                      ? " The source response has no verified reporting period. Annual 2024 figures are unavailable."
                      : ` Financial totals were queried for ${uninfoData.year}.`}
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
                            {uninfoData.year === null
                              ? "Reported totals — period unverified"
                              : "Overall"}
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
                                const goalOrder = (key: string) =>
                                  key === "unclassified" ? 18 : Number(key);
                                if (uninfoSort === "sdg_number")
                                  return goalOrder(a[0]) - goalOrder(b[0]);
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
                                return goalOrder(a[0]) - goalOrder(b[0]);
                              });
                              const maxVal = Math.max(
                                1,
                                ...entries.map(([, m]) =>
                                  Math.max(m.required, m.available, m.spent),
                                ),
                              );
                              return sorted.map(([sdgNum, metrics]) => {
                                const unclassified = sdgNum === "unclassified";
                                const sdg = Number(sdgNum);
                                const label = unclassified
                                  ? "Not classified by SDG"
                                  : SDG_SHORT_TITLES[sdg];
                                const color = unclassified
                                  ? "#6b7280"
                                  : SDG_COLORS[sdg];
                                const Row = unclassified ? "div" : "button";
                                const barWidth =
                                  (Math.max(
                                    0,
                                    metrics.required,
                                    metrics.available,
                                    metrics.spent,
                                  ) /
                                    maxVal) *
                                  100;
                                return (
                                  <Tooltip key={sdgNum} delayDuration={200}>
                                    <TooltipTrigger asChild>
                                      <Row
                                        data-uninfo-sdg={sdgNum}
                                        tabIndex={unclassified ? 0 : undefined}
                                        onClick={
                                          unclassified
                                            ? undefined
                                            : () =>
                                                navigateToSidebar("sdg", sdg)
                                        }
                                        className={`group flex w-full items-center gap-2 rounded ${unclassified ? "" : "hover:bg-gray-50"}`}
                                      >
                                        <span
                                          className={
                                            unclassified
                                              ? "w-28 flex-shrink-0 text-left text-xs text-gray-700"
                                              : "w-20 flex-shrink-0 truncate text-left text-xs text-gray-700 group-hover:text-un-blue group-hover:underline"
                                          }
                                          title={label}
                                        >
                                          {label}
                                        </span>
                                        {!unclassified && (
                                          <FinancialPanelGoalBadge
                                            label={String(sdg)}
                                            color={color}
                                          />
                                        )}
                                        <div className="flex flex-1 flex-col gap-px">
                                          <div
                                            style={{ width: `${barWidth}%` }}
                                          >
                                            <UninfoFundingBar
                                              required={metrics.required}
                                              available={metrics.available}
                                              spent={metrics.spent}
                                              showLabels={false}
                                              color={color}
                                            />
                                          </div>
                                        </div>
                                      </Row>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="border border-slate-200 bg-white p-3 text-slate-800 shadow-lg"
                                    >
                                      <p className="mb-2 text-xs font-medium">
                                        {unclassified
                                          ? label
                                          : `SDG ${sdg}: ${label}`}
                                      </p>
                                      <UninfoFundingBar
                                        required={metrics.required}
                                        available={metrics.available}
                                        spent={metrics.spent}
                                        color={color}
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
                          <p className="mb-2 text-xs text-gray-500">
                            {uninfoData.framework_year
                              ? `Framework financials: ${uninfoData.framework_year}.`
                              : "Framework financials have no verified reporting period in this source snapshot."}
                          </p>
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
                          Projects (
                          {
                            new Set(
                              uninfoData.projects.map((project) => project.id),
                            ).size
                          }
                          )
                        </FinancialPanelHeading>
                        <div className="mt-2">
                          <p className="mb-2 text-xs text-gray-500">
                            {uninfoData.projects_year
                              ? `Project financials: ${uninfoData.projects_year}.`
                              : "Project financials have no verified reporting period in this source snapshot."}{" "}
                            Rows describe agency participation in projects.
                          </p>
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
          )}
        </div>
      </FinancialDetailPanel>
    </DetailDrawer>
  );
}
