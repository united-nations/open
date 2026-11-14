"use client";
import { MapBoundaryDisclaimer } from "@/components/MapBoundaryDisclaimer";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import type { LocationView } from "@/components/LocationViewControl";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";

import { GeographicSidebar } from "./GeographicSidebar";
import {
  OrganizationHierarchySelect,
  organizationHierarchyGroups,
} from "./OrganizationHierarchySelect";
import {
  GEOGRAPHIC_LEVELS,
  geographicSubregion,
  type GeographicExpense,
  type GeographicLevel,
} from "@/lib/geographicExpenses";
import type { Entity } from "@/types";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  FinancialBubbleMap,
  MapBubbleLegendCircle,
  mapBubbleLegendClassName,
} from "@/components/FinancialBubbleMap";
import { bubbleRadiusInput } from "@/lib/map-bubbles";
import { CountrySidebar } from "@/components/CountrySidebar";
import {
  CountryTreemap,
  CountryFinancialTooltip,
} from "@/components/CountryTreemap";
import { YearSlider } from "@/components/YearSlider";
import {
  useDeepLink,
  replaceToSidebar,
  clearSidebarHash,
} from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { getRegionStyle } from "@/lib/regionGroupings";
import { RankedDetailList } from "@/components/RankedDetailList";
import { formatBudget } from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";
import { useViewportMapHeight } from "@/hooks/useViewportMapHeight";

type CountryExpense = GeographicExpense;
interface GeographicMapPoint {
  color: GeographicLevel;
  id: string;
  lat: number;
  long: number;
  radius: number;
  label: string;
  data: GeographicExpense;
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const BUBBLE_REFERENCE_AMOUNT = 1_000_000_000;
const BUBBLE_REFERENCE_RADIUS = 12;

export function CountryMap({
  active,
  controls,
  view,
  searchQuery,
  setSearchQuery,
  entityMetadata,
  entityFilter,
  setEntityFilter,
  selectedYear,
  setSelectedYear,
}: {
  active: boolean;
  controls: ReactNode;
  view: LocationView;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  entityMetadata: Entity[];
  entityFilter: string;
  setEntityFilter: (selection: string) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}) {
  const [levels, setLevels] = useState<GeographicLevel[]>(
    GEOGRAPHIC_LEVELS.map((item) => item.key),
  );
  const [selectedGeography, setSelectedGeography] = useState<string | null>(
    null,
  );
  const yearRanges = useYearRanges();
  const COUNTRY_YEARS = yearRanges.geographicExpenses.years;

  const [loadedCountryData, setCountryData] = useState<CountryExpense[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [errorYear, setErrorYear] = useState<number | null>(null);
  const showMap = view === "map";
  const mapHeight = useViewportMapHeight(650);
  const emptyHeight = view === "chart" ? SYSTEM_TREEMAP_HEIGHT_CLASS : "h-80";
  const emptyStyle = showMap ? { height: mapHeight } : undefined;
  const loadError = errorYear === selectedYear;
  const countryData = useMemo(
    () => (loadedYear === selectedYear ? loadedCountryData : []),
    [loadedYear, selectedYear, loadedCountryData],
  );
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "country",
    onNavigateAway: () => {
      setSelectedCountry(null);
      setSelectedGeography(null);
    },
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      if (pendingDeepLink) {
        const requestedYear = Number(
          new URLSearchParams(window.location.search).get("year"),
        );
        if (yearRanges.geographicExpenses.years.includes(requestedYear)) {
          if (selectedYear !== requestedYear) {
            setSelectedYear(requestedYear);
            return;
          }
          if (loadedYear !== requestedYear) return;
        }
        if (loading || loadedYear !== selectedYear || countryData.length === 0)
          return;
        const country = countryData.find((c) => c.iso3 === pendingDeepLink);
        if (country) {
          setSelectedCountry({
            iso3: country.iso3,
            name: country.name,
            total: country.total,
            entities: country.entities,
          });
        }
        setPendingDeepLink(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    active,
    loading,
    pendingDeepLink,
    countryData,
    setPendingDeepLink,
    selectedYear,
    setSelectedYear,
    loadedYear,
    yearRanges.geographicExpenses.years,
  ]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${basePath}/data/geographic-expenses-${selectedYear}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: CountryExpense[]) => {
        if (cancelled) return;
        setErrorYear(null);
        setCountryData(data);
        setLoadedYear(selectedYear);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load country data:", err);
        setErrorYear(selectedYear);
        setCountryData([]);
        setSelectedCountry(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const entityGroups = useMemo(
    () =>
      organizationHierarchyGroups(
        countryData.flatMap((row) => Object.keys(row.entities)),
        entityMetadata,
      ),
    [countryData, entityMetadata],
  );
  const filterGroup = entityGroups.find((group) => group.id === entityFilter);
  const filterUnavailable =
    entityFilter !== "all" &&
    !filterGroup &&
    !entityGroups.some((group) => group.children.includes(entityFilter));
  const entityScopedData = countryData.map((row) => {
    const entities = Object.fromEntries(
      Object.entries(row.entities).filter(
        ([entity]) =>
          entityFilter === "all" ||
          entity === entityFilter ||
          filterGroup?.children.includes(entity),
      ),
    );
    return {
      ...row,
      entities,
      total: Object.values(entities).reduce((sum, amount) => sum + amount, 0),
    };
  });
  const scopedData = entityScopedData.filter((row) =>
    levels.includes(row.level),
  );
  const filteredData = searchQuery.trim()
    ? scopedData.filter((country) => {
        const term = searchQuery.trim().toLowerCase();
        return (
          country.name.toLowerCase().includes(term) ||
          country.region.toLowerCase().includes(term) ||
          (!showMap &&
            geographicSubregion(country)?.toLowerCase().includes(term)) ||
          country.iso3.toLowerCase().includes(term)
        );
      })
    : scopedData;

  // Scale up a selected entity's geographic distribution using its share of
  // all positive expenditure. Search and level toggles never change this base.
  // Signed amounts remain unchanged in the data and financial summaries.
  const allPositiveTotal = countryData.reduce(
    (sum, row) => sum + Math.max(0, row.total),
    0,
  );
  const entityPositiveTotal = entityScopedData.reduce(
    (sum, row) => sum + Math.max(0, row.total),
    0,
  );
  const bubbleReferenceAmount =
    entityFilter === "all" || allPositiveTotal <= 0 || entityPositiveTotal <= 0
      ? BUBBLE_REFERENCE_AMOUNT
      : BUBBLE_REFERENCE_AMOUNT *
        Math.min(1, entityPositiveTotal / allPositiveTotal);

  // Keep marker keys unique even when source classifications repeat a name.
  const mapData: GeographicMapPoint[] = filteredData
    .filter((country) => country.total > 0)
    .map((country) => ({
      id: country.iso3,
      color: country.level,
      lat: country.lat,
      long: country.long,
      radius: bubbleRadiusInput(
        country.total,
        bubbleReferenceAmount,
        BUBBLE_REFERENCE_RADIUS,
      ),
      label: country.iso3,
      data: country,
    }));

  const handleClick = (d: GeographicMapPoint | undefined) => {
    if (d && d.data) {
      if (d.data.level !== "country" || !/^[A-Z]{3}$/.test(d.data.iso3)) {
        setSelectedGeography(d.data.iso3);
        return;
      }
      setSelectedCountry({
        iso3: d.data.iso3,
        name: d.data.name,
        total: d.data.total,
        entities: d.data.entities,
      });
      replaceToSidebar("country", d.data.iso3);
    }
  };

  const handleTreemapClick = (country: CountryExpense) => {
    if (country.level !== "country" || !/^[A-Z]{3}$/.test(country.iso3)) {
      setSelectedGeography(country.iso3);
      return;
    }
    setSelectedCountry({
      iso3: country.iso3,
      name: country.name,
      total: country.total,
      entities: country.entities,
    });
    replaceToSidebar("country", country.iso3);
  };

  const handleClose = () => {
    setSelectedCountry(null);
    clearSidebarHash();
  };

  const reportingLevels = (
    <div
      role="group"
      aria-label="Reporting level"
      className={
        showMap
          ? `${mapBubbleLegendClassName} grid grid-cols-2 gap-x-2`
          : "flex min-w-0 flex-wrap items-center gap-2 border-l border-gray-200 pl-3"
      }
    >
      {!showMap && (
        <span className="text-xs whitespace-nowrap text-gray-600">
          Reporting level
        </span>
      )}
      {GEOGRAPHIC_LEVELS.map((level) => (
        <button
          key={level.key}
          type="button"
          aria-pressed={levels.includes(level.key)}
          onClick={() =>
            setLevels((current) =>
              current.includes(level.key)
                ? current.filter((key) => key !== level.key)
                : [...current, level.key],
            )
          }
          className={
            showMap
              ? "flex min-h-11 items-center gap-1.5 rounded px-1 text-start text-xs focus-visible:outline-2 focus-visible:outline-un-blue aria-pressed:font-medium aria-[pressed=false]:opacity-55 sm:min-h-7"
              : `inline-flex min-h-11 items-center rounded-full border px-2 py-1 text-xs text-black sm:min-h-0 ${levels.includes(level.key) ? "border-gray-300 bg-gray-100" : "border-gray-200 bg-white opacity-50"}`
          }
        >
          {showMap && <MapBubbleLegendCircle color={level.color} radius={5} />}
          {level.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative w-full">
      <DelayedChartLoading
        pending={loadedYear !== selectedYear}
        requestKey={selectedYear}
      />
      <ChartFrame
        header={
          <ChartHeader
            yearControl={
              <YearSlider
                years={COUNTRY_YEARS}
                selectedYear={selectedYear}
                onChange={setSelectedYear}
              />
            }
            controls={controls}
            search={
              <ChartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by country or region..."
                label="Search by country or region"
                className="sm:w-48"
              />
            }
            summaries={[
              {
                key: "total",
                label: searchQuery ? "Matching total" : "Total",
                value: filteredData.some(
                  (row) => Object.keys(row.entities).length > 0,
                )
                  ? formatBudget(
                      filteredData.reduce(
                        (sum, country) => sum + country.total,
                        0,
                      ),
                    )
                  : "Unavailable",
              },
            ]}
          />
        }
        footer={<ChartFooter hint="Select a location to explore details" />}
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <OrganizationHierarchySelect
            groups={entityGroups}
            selected={entityFilter}
            onChange={setEntityFilter}
            allLabel="All entities"
          />
          {!showMap && reportingLevels}
        </div>
        {/* Map or Treemap View */}
        {!countryData.length ? (
          <p
            className={`flex ${emptyHeight} items-center justify-center text-lg text-gray-500`}
            style={emptyStyle}
          >
            {loadError
              ? `Geographic data could not be loaded for ${selectedYear}.`
              : `Loading geographic data for ${selectedYear}…`}
          </p>
        ) : filterUnavailable ? (
          <p
            className={`flex ${emptyHeight} items-center justify-center text-sm text-gray-600`}
            style={emptyStyle}
          >
            No geographic expenditure is available for this selection in{" "}
            {selectedYear}.
          </p>
        ) : view === "list" ? (
          <RankedDetailList
            label="Expenditure by location"
            items={filteredData
              .filter((row) => Object.keys(row.entities).length > 0)
              .map((row) => {
                const region = row.region || "Unknown";
                const style = getRegionStyle(region);
                const subregion = geographicSubregion(row);
                return {
                  id: row.iso3,
                  label: row.name,
                  description: GEOGRAPHIC_LEVELS.find(
                    (level) => level.key === row.level,
                  )?.label,
                  amount: row.total,
                  value: formatBudget(row.total),
                  group: { key: region, label: style.label },
                  subgroup: subregion
                    ? { key: subregion, label: subregion }
                    : undefined,
                  color: style.color,
                  onOpen: () => handleTreemapClick(row),
                };
              })}
          />
        ) : showMap ? (
          <div className="relative">
            {mapData.length === 0 ? (
              <div
                className="flex w-full items-center justify-center bg-gray-100 px-4 text-center"
                style={emptyStyle}
              >
                <p className="text-lg text-gray-500">
                  No positive expenditure matches the selected filters
                </p>
              </div>
            ) : (
              <FinancialBubbleMap
                testId="locations-map"
                ariaLabel={`Map of UN System geographic expenditure in ${selectedYear}`}
                data={mapData}
                colors={GEOGRAPHIC_LEVELS.map((item) => item.color)}
                colorDomain={GEOGRAPHIC_LEVELS.map((item) => item.key)}
                radius={BUBBLE_REFERENCE_RADIUS}
                tooltip={(d: GeographicMapPoint) => (
                  <CountryFinancialTooltip country={d.data} />
                )}
                onSeriesMouseClick={handleClick}
              />
            )}
            {reportingLevels}
          </div>
        ) : (
          <>
            <CountryTreemap
              hideHeader
              data={filteredData}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onCountryClick={(country) =>
                handleTreemapClick(country as GeographicExpense)
              }
            />
          </>
        )}
      </ChartFrame>
      {showMap && mapData.length > 0 && <MapBoundaryDisclaimer />}

      {active &&
        selectedGeography &&
        scopedData.find((row) => row.iso3 === selectedGeography) && (
          <GeographicSidebar
            row={scopedData.find((row) => row.iso3 === selectedGeography)!}
            year={loadedYear ?? selectedYear}
            years={COUNTRY_YEARS}
            onYearChange={setSelectedYear}
            onClose={() => setSelectedGeography(null)}
          />
        )}
      {active && selectedCountry && (
        <CountrySidebar
          country={selectedCountry}
          initialYear={selectedYear}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
