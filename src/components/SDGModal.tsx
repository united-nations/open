"use client";
import { useYearResource } from "@/hooks/useYearResource";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { useCallback, useEffect, useState } from "react";
import { formatBudget } from "@/lib/entities";
import { SDG, SDGExpensesData, getSDGKey } from "@/lib/sdgs";
import { useRouter } from "next/navigation";
import { SidebarControls } from "@/components/SidebarControls";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelTotalRow,
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
import { SHOW_UNINFO, SHOW_UNINFO_SORT_CONTROLS } from "@/lib/featureFlags";
import { SortSelector, SortOption } from "@/components/ui/sort-selector";

const UNINFO_SORT_OPTIONS: SortOption[] = [
  { value: "available", label: "Available resources" },
  { value: "required", label: "Required resources" },
  { value: "spent", label: "Expenditure" },
  { value: "funding_gap", label: "Funding gap" },
  { value: "spending_gap", label: "Available resources less expenditure" },
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

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
  const router = useRouter();
  const [showAllEntities, setShowAllEntities] = useState(false);

  // Year selection
  const yearRanges = useYearRanges();
  const availableYears = generateYearRange(
    yearRanges.sdgExpenses.min,
    yearRanges.sdgExpenses.max,
  ).reverse();
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const loadYear = useCallback(async (): Promise<
    { [entity: string]: number } | undefined
  > => {
    const data = await fetch(
      `${basePath}/data/sdg-expenses-${selectedYear}.json`,
    ).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<SDGExpensesData>;
    });
    return sdg ? data[getSDGKey(sdg.number)]?.entities : undefined;
  }, [selectedYear, sdg]);
  const {
    value: yearEntityExpenses,
    loading: loadingYear,
    error: yearError,
  } = useYearResource<{ [entity: string]: number } | undefined>(
    `${sdg?.number}-${selectedYear}`,
    entityExpenses,
    !sdg || (selectedYear === initialYear && entityExpenses !== undefined),
    loadYear,
    undefined,
  );

  // UNINFO Cooperation Framework data
  const [uninfoData, setUninfoData] = useState<UninfoSdgData | null>(null);
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [uninfoSort, setUninfoSort] = useState("available");

  // Load UNINFO data and country names
  useEffect(() => {
    if (!SHOW_UNINFO || !sdg || sdg.number <= 0) return;
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

  if (!sdg) return null;

  // Process entity expenses for display (use year-specific data)
  const sortedEntities = yearEntityExpenses
    ? Object.entries(yearEntityExpenses)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) =>
          sdg.number === -1
            ? Math.abs(b.amount) - Math.abs(a.amount)
            : b.amount - a.amount,
        )
    : [];

  const displayedEntities = showAllEntities
    ? sortedEntities
    : sortedEntities.slice(0, 10);

  const maxAmount =
    sortedEntities.length > 0
      ? Math.max(...sortedEntities.map((e) => Math.abs(e.amount)))
      : 0;

  const totalExpenses = sortedEntities.reduce((sum, e) => sum + e.amount, 0);

  const modalTitleId = `sdg-modal-title-${sdg.number}`;

  return (
    <DetailDrawer
      titleId={modalTitleId}
      onClose={onClose}
      swipeToClose
      className="overflow-hidden sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px]"
    >
      <FinancialDetailPanel
        titleId={modalTitleId}
        className="sm:w-full"
        title={
          <DrawerTitle className="flex items-start gap-2">
            {sdg.number > 0 && (
              <span
                className="flex size-6 shrink-0 items-center justify-center font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {sdg.number}
              </span>
            )}
            <span className="min-w-0">{sdg.shortTitle}</span>
          </DrawerTitle>
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
            onClose={onClose}
            closeLabel="Close modal"
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
          {/* Entity Spending Breakdown */}
          {(yearEntityExpenses !== undefined || loadingYear) && (
            <div>
              <FinancialPanelHeading className="mb-3">
                System-wide financials
              </FinancialPanelHeading>

              <FinancialPanelTotalRow
                label={
                  sdg.number === -1 ? "Calculated balance" : "Total expenditure"
                }
                value={
                  loadingYear
                    ? "Loading…"
                    : sortedEntities.length
                      ? formatBudget(totalExpenses)
                      : "Unavailable"
                }
              />

              <div className="mt-4">
                <FinancialPanelHeading subheading>
                  {sdg.number === -1
                    ? "Reconciliation by entity"
                    : "Expenditure by entity"}
                </FinancialPanelHeading>
                <div className="mt-2 space-y-1.5">
                  {displayedEntities.map((entity) => {
                    const normalizedWidth =
                      maxAmount > 0
                        ? (Math.abs(entity.amount) / maxAmount) * 100
                        : 0;
                    return (
                      <FinancialPanelRankedRow
                        key={entity.name}
                        label={entity.name}
                        value={formatBudget(entity.amount)}
                        onClick={() =>
                          router.push(
                            `/system/organizations/?year=${selectedYear}#entity=${encodeURIComponent(entity.name)}`,
                          )
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
                {!loadingYear && sortedEntities.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    No entity breakdown is available for {selectedYear}.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* UNSDG Cooperation Framework Section */}
          {SHOW_UNINFO && sdg.number > 0 && uninfoData && (
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
                    Cooperation Framework programme data only, not
                    representative of total expenditure.
                    {uninfoData.year === null
                      ? " The global source snapshot has no verified query period; country comparisons below include only verified 2024 country observations."
                      : ` Global totals were queried for ${uninfoData.year}.`}
                    Shared-workspace totals are excluded from country
                    comparisons.
                  </p>

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
                          const entries = Object.entries(uninfoData.countries);
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
                            1,
                            ...top10.map(([, m]) =>
                              Math.max(m.required, m.available, m.spent),
                            ),
                          );
                          return top10.map(([iso3, metrics]) => {
                            const barWidth =
                              (Math.max(
                                0,
                                metrics.required,
                                metrics.available,
                                metrics.spent,
                              ) /
                                maxVal) *
                              100;
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
                                      <div style={{ width: `${barWidth}%` }}>
                                        <UninfoFundingBar
                                          required={metrics.required}
                                          available={metrics.available}
                                          spent={metrics.spent}
                                          showLabels={false}
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
          {sdg.number > 0 && (
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
          )}
        </div>
      </FinancialDetailPanel>
    </DetailDrawer>
  );
}
