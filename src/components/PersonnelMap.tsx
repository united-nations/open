"use client";

import { MapBoundaryDisclaimer } from "@/components/MapBoundaryDisclaimer";
import { useMemo, type ReactNode } from "react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import type { LocationView } from "@/components/LocationViewControl";
import {
  FinancialBubbleMap,
  MapBubbleLegendCircle,
  mapBubbleLegendClassName,
} from "@/components/FinancialBubbleMap";
import { RankedDetailList } from "@/components/RankedDetailList";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { ChartFooter } from "@/components/ChartFooter";
import { bubbleRadiusInput } from "@/lib/map-bubbles";
import { getRegionStyle } from "@/lib/regionGroupings";
import { formatPeople, type PersonnelData } from "@/lib/personnel";
import { useViewportMapHeight } from "@/hooks/useViewportMapHeight";

const staffColor = "#009edb";
const referenceCount = 1000;
const referenceRadius = 12;

export function PersonnelMap({
  data,
  year,
  loadError,
  onRetry,
  org,
  controls,
  view,
  query,
  onQueryChange,
  organizationControl,
  organizationCodes,
  yearControl,
  onOpen,
}: {
  data: PersonnelData | null;
  year: number;
  loadError: boolean;
  onRetry: () => void;
  org: string;
  controls: ReactNode;
  view: LocationView;
  query: string;
  onQueryChange: (query: string) => void;
  organizationControl: ReactNode;
  organizationCodes?: readonly string[];
  yearControl: ReactNode;
  onOpen: (iso3: string) => void;
}) {
  const mapHeight = useViewportMapHeight(650);
  const emptyHeight = view === "chart" ? SYSTEM_TREEMAP_HEIGHT_CLASS : "h-80";
  const countries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        iso3: string;
        label: string;
        region: string;
        subregion: string;
        lat: number | null;
        long: number | null;
        count: number;
      }
    >();
    for (const row of data?.dutyStations ?? []) {
      if (
        organizationCodes
          ? !organizationCodes.includes(row.org)
          : org !== "all" && row.org !== org
      )
        continue;
      const item = grouped.get(row.iso3) ?? {
        iso3: row.iso3,
        label: row.country === "NA" ? "Not reported" : row.country,
        region: row.region || "Unknown",
        subregion: row.subregion,
        lat: row.lat,
        long: row.long,
        count: 0,
      };
      item.count += row.count;
      grouped.set(row.iso3, item);
    }
    const term = query.trim().toLocaleLowerCase();
    return [...grouped.values()]
      .filter((row) =>
        `${row.label} ${row.iso3} ${row.region} ${row.subregion}`
          .toLocaleLowerCase()
          .includes(term),
      )
      .sort((a, b) => b.count - a.count);
  }, [data, org, query, organizationCodes]);
  const total = countries.reduce((sum, row) => sum + row.count, 0);
  const unmapped = countries
    .filter((row) => row.lat === null || row.long === null)
    .reduce((sum, row) => sum + row.count, 0);
  const points = countries.flatMap((row) =>
    row.lat === null || row.long === null || row.count <= 0
      ? []
      : [
          {
            ...row,
            lat: row.lat,
            long: row.long,
            color: "Staff",
            id: row.iso3,
            radius: bubbleRadiusInput(
              row.count,
              referenceCount,
              referenceRadius,
            ),
          },
        ],
  );
  const groups = new Map<string, typeof countries>();
  for (const country of countries) {
    const members = groups.get(country.region) ?? [];
    members.push(country);
    groups.set(country.region, members);
  }
  return (
    <section id="personnel-geography" aria-label="Staff by duty station">
      <ChartFrame
        header={
          <ChartHeader
            controls={controls}
            yearControl={yearControl}
            search={
              <div
                className="w-full sm:w-48"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    event.target instanceof HTMLInputElement &&
                    query.trim() &&
                    countries.length === 1
                  ) {
                    event.preventDefault();
                    onOpen(countries[0].iso3);
                  }
                }}
              >
                <ChartSearchInput
                  value={query}
                  onChange={onQueryChange}
                  placeholder="Search countries…"
                  label="Search countries"
                  className="sm:w-full"
                />
              </div>
            }
            summaries={[
              {
                key: "total",
                label: query.trim() ? "Matching staff" : "Total staff",
                value: loadError
                  ? "Unavailable"
                  : !data
                    ? "Loading…"
                    : countries.length
                      ? formatPeople(total)
                      : "Unavailable",
              },
            ]}
          />
        }
        footer={
          <ChartFooter hint="Select a country to explore organizations and duty stations" />
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {organizationControl}
        </div>
        {!data || countries.length === 0 ? (
          <div
            role={loadError ? "alert" : "status"}
            className={`flex ${emptyHeight} items-center justify-center gap-2 px-4 text-center text-sm text-gray-600`}
            style={view === "map" ? { height: mapHeight } : undefined}
          >
            {loadError ? (
              <p>
                CEB duty station data could not be loaded for {year}.{" "}
                <button type="button" className="underline" onClick={onRetry}>
                  Try again
                </button>
              </p>
            ) : !data ? (
              `Loading CEB duty station data for ${year}…`
            ) : (
              `No duty station records match these filters in ${year}.`
            )}
          </div>
        ) : view === "list" ? (
          <RankedDetailList
            label="Staff by country"
            items={countries.map((row) => ({
              id: row.iso3,
              label: row.label,
              amount: row.count,
              value: `${formatPeople(row.count)} staff`,
              group: {
                key: row.region,
                label: getRegionStyle(row.region).label,
              },
              subgroup: row.subregion
                ? { key: row.subregion, label: row.subregion }
                : undefined,
              color: getRegionStyle(row.region).color,
              onOpen: () => onOpen(row.iso3),
            }))}
          />
        ) : view === "chart" ? (
          <GroupedTreemap
            hideHeader
            hideList
            rows={[...groups].map(([region, members]) => {
              const style = getRegionStyle(region);
              return {
                key: region,
                label: style.label,
                color: style.color,
                leaves: members.map((row) => ({
                  key: row.iso3,
                  label: row.label,
                  value: row.count,
                  color: style.color,
                  onActivate: () => onOpen(row.iso3),
                })),
              };
            })}
            totalLabel="Staff"
            plotClassName={SYSTEM_TREEMAP_HEIGHT_CLASS}
            showLeafValues
            formatValue={formatPeople}
            formatAccessibleValue={(value) => `${formatPeople(value)} staff`}
          />
        ) : (
          <div className="relative">
            <FinancialBubbleMap
              data={points}
              colors={[staffColor]}
              colorDomain={["Staff"]}
              radius={referenceRadius}
              testId="personnel-map"
              ariaLabel={`Staff by country of duty station in ${data.year}`}
              tooltip={(point) => (
                <div className="text-sm">
                  <strong>{point.label}</strong>
                  <p>{formatPeople(point.count)} staff</p>
                </div>
              )}
              onSeriesMouseClick={(point) => {
                if (point) onOpen(point.iso3);
              }}
            />
            <span
              className={`${mapBubbleLegendClassName} inline-flex items-center gap-1.5`}
            >
              <MapBubbleLegendCircle
                color={staffColor}
                radius={referenceRadius}
              />
              1,000 staff
            </span>
          </div>
        )}
      </ChartFrame>
      {view === "map" && countries.length > 0 && (
        <>
          {unmapped > 0 && (
            <p className="text-xs text-gray-500">
              {formatPeople(unmapped)} staff have no reported country coordinate
              and are not plotted.
            </p>
          )}
          <MapBoundaryDisclaimer>
            <p className="mt-2">
              References to Kosovo shall be understood in the context of
              Security Council resolution 1244 (1999).
            </p>
          </MapBoundaryDisclaimer>
        </>
      )}
    </section>
  );
}
