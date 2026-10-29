"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";

import { GeographicSidebar } from "./GeographicSidebar";
import { HierarchicalSingleSelect } from "./ui/hierarchical-single-select";
import {
  GEOGRAPHIC_LEVELS,
  geographicSubregion,
  type GeographicExpense,
  type GeographicLevel,
} from "@/lib/geographicExpenses";
import type { Entity } from "@/types";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { useEffect, useState, useMemo } from "react";
import { FinancialBubbleMap } from "@/components/FinancialBubbleMap";
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
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { formatBudget, UNCATEGORIZED_SYSTEM_GROUP } from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";

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

export function CountryMap() {
  const [entityMetadata, setEntityMetadata] = useState<Entity[]>([]);
  const [entityFilter, setEntityFilter] = useState("all");
  const [levels, setLevels] = useState<GeographicLevel[]>(
    GEOGRAPHIC_LEVELS.map((item) => item.key),
  );
  const [selectedGeography, setSelectedGeography] = useState<string | null>(
    null,
  );
  useEffect(() => {
    fetch(`${basePath}/data/entities.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setEntityMetadata)
      .catch(console.error);
  }, []);
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
  const [showMap, setShowMap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(
    yearRanges.geographicExpenses.default,
  );
  const loadError = errorYear === selectedYear;
  const countryData = useMemo(
    () => (loadedYear === selectedYear ? loadedCountryData : []),
    [loadedYear, selectedYear, loadedCountryData],
  );
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "country",
    sectionId: "countries",
    onNavigateAway: () => setSelectedCountry(null),
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
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
    loading,
    pendingDeepLink,
    countryData,
    setPendingDeepLink,
    selectedYear,
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

  const entityGroups = useMemo(() => {
    const metadata = new Map(
      entityMetadata.map((entity) => [entity.entity, entity]),
    );
    // CEB records define membership; Airtable only supplies categories.
    const codes = new Set(
      countryData.flatMap((row) => Object.keys(row.entities)),
    );
    const groups = new Map<string, string[]>();
    for (const code of codes) {
      if (!code) continue;
      const group =
        metadata.get(code)?.system_grouping || UNCATEGORIZED_SYSTEM_GROUP;
      const members = groups.get(group) ?? [];
      members.push(code);
      groups.set(group, members);
    }
    return [...groups]
      .map(([group, members]) => ({
        id: `group:${group}`,
        label: group,
        color: getSystemGroupingStyle(group).hexColor,
        children: members.sort((a, b) => a.localeCompare(b)),
      }))
      .sort(
        (a, b) =>
          getSystemGroupingStyle(a.label).order -
            getSystemGroupingStyle(b.label).order ||
          a.label.localeCompare(b.label),
      );
  }, [countryData, entityMetadata]);
  const appliedEntityFilter = entityGroups.some(
    (group) =>
      group.id === entityFilter || group.children.includes(entityFilter),
  )
    ? entityFilter
    : "all";
  const entityScopedData = countryData.map((row) => {
    const entities = Object.fromEntries(
      Object.entries(row.entities).filter(
        ([entity]) =>
          appliedEntityFilter === "all" ||
          entity === appliedEntityFilter ||
          entityGroups
            .find((group) => group.id === appliedEntityFilter)
            ?.children.includes(entity),
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
        const term = searchQuery.toLowerCase();
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
    appliedEntityFilter === "all" ||
    allPositiveTotal <= 0 ||
    entityPositiveTotal <= 0
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

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (!countryData || countryData.length === 0) {
    return (
      <div className="flex h-[650px] w-full flex-col items-center justify-center gap-4 bg-gray-100">
        <YearSlider
          years={COUNTRY_YEARS}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
        />
        <p className="text-lg text-gray-500">
          {loadError
            ? `Geographic data could not be loaded for ${selectedYear}.`
            : `Loading geographic data for ${selectedYear}…`}
        </p>
      </div>
    );
  }

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
            controls={
              <BinaryToggle
                variant="segmented"
                label="Geographic view"
                options={[
                  { value: "chart", label: "Chart" },
                  { value: "map", label: "Map" },
                ]}
                value={showMap ? "map" : "chart"}
                onValueChange={(value) => setShowMap(value === "map")}
              />
            }
            search={
              <ChartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by country or region..."
              />
            }
            summaries={[
              {
                key: "total",
                label: searchQuery ? "Matching total" : "Total",
                value: formatBudget(
                  filteredData.reduce((sum, country) => sum + country.total, 0),
                ),
              },
            ]}
          />
        }
        footer={
          <ChartFooter
            hint="Click on a location to explore details"
            signedAmounts={filteredData.map((row) => ({
              group: row.region,
              label: `${row.name} (${row.level})`,
              amount: row.total,
            }))}
          />
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <HierarchicalSingleSelect
            groups={[
              { id: "all", label: "All entities", children: [] },
              ...entityGroups,
            ]}
            selected={appliedEntityFilter}
            onChange={setEntityFilter}
            getLabel={(id) =>
              id === "all"
                ? "All entities"
                : entityGroups.find((group) => group.id === id)?.label || id
            }
          />
          <div
            role="group"
            aria-label="Reporting level"
            className={
              showMap
                ? ""
                : "flex min-w-0 flex-wrap items-center gap-2 border-l border-gray-200 pl-3"
            }
          >
            {!showMap && (
              <span className="text-xs whitespace-nowrap text-gray-600">
                Reporting level
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
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
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs text-black ${levels.includes(level.key) ? "border-gray-300 bg-gray-100" : "border-gray-200 bg-white opacity-50"}`}
                >
                  {showMap && (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                  )}
                  {level.label}
                </button>
              ))}
            </div>
          </div>
          {showMap && (
            <span
              aria-label="Circle size reference"
              className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-600"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                aria-hidden="true"
              >
                <circle
                  cx="14"
                  cy="14"
                  r={BUBBLE_REFERENCE_RADIUS}
                  fill="#6b7280"
                  fillOpacity="0.28"
                  stroke="#6b7280"
                />
              </svg>
              {formatBudget(bubbleReferenceAmount)}
            </span>
          )}
        </div>
        {/* Map or Treemap View */}
        {showMap && mapData.length === 0 ? (
          <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
            <p className="text-lg text-gray-500">
              No positive expenditure matches the selected filters
            </p>
          </div>
        ) : showMap ? (
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

      {selectedGeography &&
        scopedData.find((row) => row.iso3 === selectedGeography) && (
          <GeographicSidebar
            row={scopedData.find((row) => row.iso3 === selectedGeography)!}
            year={loadedYear ?? selectedYear}
            years={COUNTRY_YEARS}
            onYearChange={setSelectedYear}
            onClose={() => setSelectedGeography(null)}
          />
        )}
      {selectedCountry && (
        <CountrySidebar
          country={selectedCountry}
          initialYear={selectedYear}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
