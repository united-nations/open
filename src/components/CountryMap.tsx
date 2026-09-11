"use client";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";

import { useEffect, useState } from "react";
import { HybridMap } from "@undp/data-viz/HybridMap";
import { CountrySidebar } from "@/components/CountrySidebar";
import { CountryTreemap } from "@/components/CountryTreemap";
import { YearSlider } from "@/components/YearSlider";
import {
  useDeepLink,
  replaceToSidebar,
  clearSidebarHash,
} from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { formatBudget } from "@/lib/entities";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { getSortedRegions } from "@/lib/regionGroupings";

interface CountryExpense {
  iso3: string;
  name: string;
  region: string;
  lat: number;
  long: number;
  total: number;
  entities: Record<string, number>;
}

interface HybridMapDataPoint {
  id: string;
  lat: number;
  long: number;
  radius: number;
  label: string;
  data: {
    iso3: string;
    name: string;
    total: number;
    entities: Record<string, number>;
  };
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function CountryMap() {
  const yearRanges = useYearRanges();
  const COUNTRY_YEARS = generateYearRange(
    yearRanges.countryExpenses.min,
    yearRanges.countryExpenses.max,
  );

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
    yearRanges.countryExpenses.default,
  );
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "country",
    sectionId: "countries",
    onNavigateAway: () => setSelectedCountry(null),
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && countryData.length > 0) {
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
  }, [loading, pendingDeepLink, countryData, setPendingDeepLink]);

  useEffect(() => {
    fetch(`${basePath}/data/country-expenses-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: CountryExpense[]) => {
        setCountryData(data);
        setLoadedYear(selectedYear);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load country data:", err);
        setLoading(false);
      });
  }, [selectedYear]);

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

  // Filter countries by search query (matches country name or region)
  const filteredData = searchQuery.trim()
    ? countryData.filter((country) => {
        const term = searchQuery.toLowerCase();
        return (
          country.name.toLowerCase().includes(term) ||
          country.region.toLowerCase().includes(term) ||
          country.iso3.toLowerCase().includes(term)
        );
      })
    : countryData;

  // Calculate radius scale based on spending (linear - area proportional to value)
  const maxSpending = Math.max(...countryData.map((d) => d.total));
  const maxRadius = 30;

  // Transform data for HybridMap - includes both id (for country clicks) and lat/long (for dots)
  const mapData: HybridMapDataPoint[] = filteredData.map((country) => ({
    id: country.iso3,
    lat: country.lat,
    long: country.long,
    radius: (country.total / maxSpending) * maxRadius,
    label: country.name,
    data: {
      iso3: country.iso3,
      name: country.name,
      total: country.total,
      entities: country.entities,
    },
  }));

  const handleClick = (d: HybridMapDataPoint) => {
    if (d && d.data) {
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
      <DelayedChartLoading pending={loadedYear !== selectedYear} requestKey={selectedYear} />
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
        footer={<ChartFooter hint="Click on a country to explore details" />}
      >
        {/* Map or Treemap View */}
        {showMap && filteredData.length === 0 ? (
          <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
            <p className="text-lg text-gray-500">
              No countries match the search criteria
            </p>
          </div>
        ) : showMap ? (
          <div className="h-[650px] w-full">
            <HybridMap
              data={mapData}
              mapProjection="equalEarth"
              scale={1.15}
              centerPoint={[0, 6]}
              colors={["#f3f4f6"]}
              dotColor="#009edb"
              dotBorderColor="#009edb"
              zoomInteraction="button"
              mapBorderWidth={0.5}
              mapBorderColor="#e5e7eb"
              mapNoDataColor="#f3f4f6"
              height={650}
              padding={"0px"}
              showAntarctica={false}
              isWorldMap={true}
              footNote=""
              showColorScale={false}
              tooltip={(d: HybridMapDataPoint) => (
                <div style={{ textAlign: "center", padding: "4px" }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#1e293b",
                      margin: 0,
                    }}
                  >
                    {d.data.name}
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#475569",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {formatBudget(d.data.total)}
                  </p>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#009edb",
                      margin: "8px 0 0 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 9 5 12 1.8-5.2L21 14Z" />
                      <path d="M7.2 2.2 8 5.1" />
                      <path d="M5.1 8 2.2 7.2" />
                      <path d="M14 4.1 12 6" />
                      <path d="m6 12-1.9 2" />
                    </svg>
                    Click for details
                  </p>
                </div>
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
              data={countryData}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onCountryClick={handleTreemapClick}
            />

            {/* Region Legend */}
            <div className="mt-3 flex flex-wrap gap-3">
              {getSortedRegions()
                .filter(([region]) => {
                  // Only show regions that have data in the current filtered set
                  return filteredData.some((c) => c.region === region);
                })
                .map(([region, styles]) => (
                  <div key={region} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-sm ${styles.bgColor}`} />
                    <span className="text-xs text-gray-600">
                      {styles.label}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </ChartFrame>

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
