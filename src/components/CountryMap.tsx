"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";

import { GeographicSidebar } from "./GeographicSidebar";
import { HierarchicalSingleSelect } from "./ui/hierarchical-single-select";
import {
  GEOGRAPHIC_LEVELS,
  type GeographicExpense,
  type GeographicLevel,
} from "@/lib/geographicExpenses";
import type { Entity } from "@/types";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { useMapBubbleZoom } from "@/hooks/useMapBubbleZoom";
import { useEffect, useState } from "react";
import { DotDensityMap } from "@undp/data-viz/DotDensityMap";
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
import { formatBudget } from "@/lib/entities";
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
      .then((res) => res.json())
      .then(setEntityMetadata)
      .catch(console.error);
  }, []);
  const yearRanges = useYearRanges();
  const COUNTRY_YEARS = yearRanges.geographicExpenses.years;

  const [countryData, setCountryData] = useState<CountryExpense[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<{
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(
    yearRanges.geographicExpenses.default,
  );
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "country",
    sectionId: "countries",
    onNavigateAway: () => setSelectedCountry(null),
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && countryData.length > 0) {
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
      .then((res) => res.json())
      .then((data: CountryExpense[]) => {
        if (cancelled) return;
        setCountryData(data);
        setLoadedYear(selectedYear);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load country data:", err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const entityGroups = [
    ...new Set(
      entityMetadata.map((item) => item.system_grouping || "Uncategorized"),
    ),
  ].map((group) => ({
    id: `group:${group}`,
    label: group,
    color: getSystemGroupingStyle(group).hexColor,
    children: entityMetadata
      .filter((item) => (item.system_grouping || "Uncategorized") === group)
      .map((item) => item.entity)
      .filter((code): code is string => !!code),
  }));
  const scopedData = countryData
    .map((row) => {
      const entities = Object.fromEntries(
        Object.entries(row.entities).filter(
          ([entity]) =>
            entityFilter === "all" ||
            entity === entityFilter ||
            entityGroups
              .find((group) => group.id === entityFilter)
              ?.children.includes(entity),
        ),
      );
      return {
        ...row,
        entities,
        total: Object.values(entities).reduce((sum, amount) => sum + amount, 0),
      };
    })
    .filter((row) => levels.includes(row.level));
  const filteredData = searchQuery.trim()
    ? scopedData.filter((country) => {
        const term = searchQuery.toLowerCase();
        return (
          country.name.toLowerCase().includes(term) ||
          country.region.toLowerCase().includes(term) ||
          country.iso3.toLowerCase().includes(term)
        );
      })
    : scopedData;

  // Calculate radius scale based on spending (linear - area proportional to value)
  const maxSpending = Math.max(1, ...filteredData.map((d) => d.total));
  const maxRadius = 30;

  // Keep marker keys unique even when source classifications repeat a name.
  const mapData: GeographicMapPoint[] = filteredData
    .filter((country) => country.total > 0)
    .map((country) => ({
      id: country.iso3,
      color: country.level,
      lat: country.lat,
      long: country.long,
      radius: (country.total / maxSpending) * maxRadius,
      label: country.iso3,
      data: country,
    }));

  const mapBubbleContainer = useMapBubbleZoom();

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (!countryData || countryData.length === 0) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Failed to load country data</p>
      </div>
    );
  }

  const handleClick = (d: GeographicMapPoint) => {
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
                  { value: "chart", label: "Budget chart" },
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
            details={
              <div className="space-y-2">
                <p>
                  Country, subregional, regional and global amounts are separate
                  reported records, not allocations of the same amount. Regional
                  markers are illustrative positions, not operational locations
                  or territorial boundaries. The global marker is placed in the
                  south Pacific for readability.
                </p>
                <details>
                  <summary className="cursor-pointer">
                    Placement notes and source classification issues
                  </summary>
                  <ul className="list-disc pl-5">
                    {filteredData
                      .filter((row) =>
                        row.notes.some((note) =>
                          /conflict|potentially|No verified|Source labels|territorial/.test(
                            note,
                          ),
                        ),
                      )
                      .map((row) => (
                        <li key={row.iso3}>
                          {row.name}: {row.notes.join(" ")}
                        </li>
                      ))}
                  </ul>
                </details>
              </div>
            }
          />
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <HierarchicalSingleSelect
            groups={[
              { id: "all", label: "All entities", children: [] },
              ...entityGroups,
            ]}
            selected={entityFilter}
            onChange={setEntityFilter}
            getLabel={(id) =>
              id === "all"
                ? "All entities"
                : entityGroups.find((group) => group.id === id)?.label || id
            }
          />
          <div
            role="group"
            aria-label="Geographic levels"
            className="flex flex-wrap gap-2"
          >
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
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: level.color }}
                />
                {level.label}
              </button>
            ))}
          </div>
        </div>
        {/* Map or Treemap View */}
        {showMap && mapData.length === 0 ? (
          <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
            <p className="text-lg text-gray-500">
              No positive spending matches the selected filters
            </p>
          </div>
        ) : showMap ? (
          <div
            ref={mapBubbleContainer}
            className="h-[650px] w-full [&_svg_circle]:stroke-[1.5px] [&_svg_circle]:[fill-opacity:0.4]"
          >
            <DotDensityMap
              data={mapData}
              mapProjection="equalEarth"
              scale={1.15}
              centerPoint={[0, 6]}
              colors={GEOGRAPHIC_LEVELS.map((item) => item.color)}
              colorDomain={GEOGRAPHIC_LEVELS.map((item) => item.key)}
              radius={15}
              zoomInteraction="button"
              mapBorderWidth={0.5}
              mapBorderColor="#e5e7eb"
              height={650}
              padding={"0px"}
              showAntarctica={false}
              isWorldMap={true}
              footNote=""
              showColorScale={false}
              tooltip={(d: GeographicMapPoint) => (
                <CountryFinancialTooltip country={d.data} />
              )}
              onSeriesMouseClick={handleClick}
              styles={{
                tooltip: {
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                  maxWidth: "200px",
                },
              }}
            />
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
