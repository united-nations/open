"use client";

import { useMemo, useState } from "react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { FinancialBubbleMap } from "@/components/FinancialBubbleMap";
import { RankedDetailList } from "@/components/RankedDetailList";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { ChartHeading } from "@/components/ContentHeading";
import { ChartFooter } from "@/components/ChartFooter";
import { bubbleRadiusInput } from "@/lib/map-bubbles";
import { formatPeople, type PersonnelData } from "@/lib/personnel";

export type PersonnelMapMode = "duty" | "nationality";

export function PersonnelMap({
  data,
  org,
  mode,
  onModeChange,
  organizationControl,
  onOpen,
}: {
  data: PersonnelData;
  org: string;
  mode: PersonnelMapMode;
  onModeChange: (mode: PersonnelMapMode) => void;
  organizationControl: React.ReactNode;
  onOpen: (mode: PersonnelMapMode, iso3: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);
  const countries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        iso3: string;
        label: string;
        lat: number | null;
        long: number | null;
        count: number;
      }
    >();
    for (const row of mode === "duty"
      ? data.dutyStations
      : data.nationalities) {
      if (org !== "all" && row.org !== org) continue;
      const item = grouped.get(row.iso3) ?? {
        iso3: row.iso3,
        label: row.country === "NA" ? "Not reported" : row.country,
        lat: row.lat,
        long: row.long,
        count: 0,
      };
      item.count += row.count;
      grouped.set(row.iso3, item);
    }
    return [...grouped.values()]
      .filter((row) =>
        `${row.label} ${row.iso3}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      )
      .sort((a, b) => b.count - a.count);
  }, [data, org, mode, query]);
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
            radius: bubbleRadiusInput(row.count, 1000, 12),
          },
        ],
  );
  return (
    <section id="personnel-geography" className="space-y-4">
      <ChartHeading>
        {mode === "duty" ? "Where do staff work?" : "Where are staff from?"}
      </ChartHeading>
      <ChartFrame
        header={
          <div
            className="flex flex-wrap items-center gap-3 lg:flex-nowrap"
            data-personnel-map-controls
          >
            <BinaryToggle
              variant="segmented"
              label="Personnel geographic view"
              options={[
                { value: "map", label: "Map" },
                { value: "list", label: "List" },
              ]}
              value={showList ? "list" : "map"}
              onValueChange={(value) => setShowList(value === "list")}
            />
            {organizationControl}
            <BinaryToggle
              variant="segmented"
              label="Personnel geographic measure"
              options={[
                { value: "duty", label: "Duty station" },
                { value: "nationality", label: "Nationality" },
              ]}
              value={mode}
              onValueChange={(value) => onModeChange(value as PersonnelMapMode)}
            />
            <label
              className="min-w-40 flex-1"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  event.target instanceof HTMLInputElement &&
                  query.trim() &&
                  countries.length === 1
                ) {
                  event.preventDefault();
                  onOpen(mode, countries[0].iso3);
                }
              }}
            >
              <span className="sr-only">
                Search countries; press Enter to open a single matching country
              </span>
              <ChartSearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search countries…"
                label="Search countries"
                className="!w-full"
              />
            </label>
            {query.trim() && (
              <span className="text-xs whitespace-nowrap text-gray-600">
                {formatPeople(total)} matching staff
              </span>
            )}
            {!showList && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-gray-600">
                <svg width="28" height="28" aria-hidden="true">
                  <circle
                    cx="14"
                    cy="14"
                    r="12"
                    fill="#009edb"
                    fillOpacity="0.3"
                    stroke="#009edb"
                  />
                </svg>
                1,000 staff
              </span>
            )}
          </div>
        }
        footer={
          <ChartFooter
            hint={
              mode === "duty"
                ? "Click on a country to explore organizations and duty stations"
                : "Click on a country to explore organizations"
            }
          />
        }
      >
        {showList ? (
          <RankedDetailList
            label="Staff by country"
            items={countries.map((row) => ({
              id: row.iso3,
              label: row.label,
              amount: row.count,
              value: `${formatPeople(row.count)} staff`,
              onOpen: () => onOpen(mode, row.iso3),
            }))}
          />
        ) : countries.length === 0 ? (
          <p className="flex h-80 items-center justify-center text-sm text-gray-600">
            No personnel records match these filters.
          </p>
        ) : (
          <FinancialBubbleMap
            data={points}
            colors={["#009edb"]}
            colorDomain={["Staff"]}
            radius={12}
            testId="personnel-map"
            ariaLabel={`Staff by ${mode === "duty" ? "country of duty station" : "nationality"} in ${data.year}`}
            tooltip={(point) => (
              <div className="text-sm">
                <strong>{point.label}</strong>
                <p>{formatPeople(point.count)} staff</p>
              </div>
            )}
            onSeriesMouseClick={(point) => {
              if (point) onOpen(mode, point.iso3);
            }}
          />
        )}
      </ChartFrame>
      {
        <p className="text-xs text-gray-500">
          {unmapped > 0 &&
            `${formatPeople(unmapped)} staff have no reported country coordinate and are not plotted. `}
          The boundaries and names shown and the designations used on this map
          do not imply official endorsement or acceptance by the United Nations.
          References to Kosovo shall be understood in the context of Security
          Council resolution 1244 (1999).
        </p>
      }
    </section>
  );
}
