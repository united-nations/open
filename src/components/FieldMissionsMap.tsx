"use client";
import { MapBoundaryDisclaimer } from "@/components/MapBoundaryDisclaimer";
import { missionLocationLabel } from "@/lib/missionLocations";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";

import { useEffect, useMemo, useState } from "react";
import { DotDensityMap } from "@undp/data-viz/DotDensityMap";
import { SecretariatGroupBar } from "@/components/SecretariatStackedBar";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
import { SidebarControls } from "@/components/SidebarControls";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { RankedDetailList } from "@/components/RankedDetailList";
import { MapInteraction } from "@/components/MapInteraction";
import {
  clearSidebarHash,
  navigateToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { useViewportMapHeight } from "@/hooks/useViewportMapHeight";
import { YearSlider } from "@/components/YearSlider";
import { loadStaticData, loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";
import {
  buildFieldMissionModel,
  type MappedMissionGroup,
} from "@/lib/fieldMissions";
import type {
  SecretariatEntitiesData,
  SecretariatGroup,
  SecretariatMissionLocation,
  SecretariatOverviewData,
} from "@/types";

type MappedGroup = MappedMissionGroup;
const DEFAULT_MISSION_KINDS: readonly MappedGroup[] = ["spm", "pko"];

interface MissionPoint {
  lat: number;
  long: number;
  radius: number;
  color: MappedGroup;
  label: string;
  data: {
    location: SecretariatMissionLocation;
    amount: number;
    group: MappedGroup;
  };
}

interface FieldMissionModel {
  totals: Record<SecretariatGroup, number>;
  points: MissionPoint[];
  groups: SecretariatOverviewData["meta"]["groups"];
  connectors: ReturnType<typeof buildFieldMissionModel>["connectors"];
}

const MAX_MISSION_RADIUS_PX = 28;
const UNDP_MIN_RADIUS_PX = 0.25;
const DOLLARS_PER_RADIUS_PIXEL_SQUARED = 1_500_000;
const CONNECTOR_FILL = "#d1d5db";
const CONNECTOR_STROKE = "#6b7280";

/**
 * DotDensityMap maps `radius` through a square-root scale with a hard-coded
 * range of [0.25, maxRadius]. Feed it the inverse of that scale so its final
 * SVG radius is exactly sqrt(amount / a fixed dollar scale). The signed value
 * also cancels the library's minimum-radius floor for the smallest missions.
 * Because the dollar scale is fixed, area stays proportional both within a
 * year and when the year changes.
 */
function proportionalAreaRadiusInput(amount: number) {
  const renderedRadius = Math.sqrt(amount / DOLLARS_PER_RADIUS_PIXEL_SQUARED);
  const scalePosition =
    (renderedRadius - UNDP_MIN_RADIUS_PX) /
    (MAX_MISSION_RADIUS_PX - UNDP_MIN_RADIUS_PX);
  return Math.sign(scalePosition) * scalePosition ** 2;
}

export function FieldMissionsMap({
  kinds = DEFAULT_MISSION_KINDS,
}: {
  kinds?: readonly MappedGroup[];
}) {
  const mapHeight = useViewportMapHeight(520);
  const years = useYearRanges().secretariatOverview;
  const [chartYear, setYear] = useState(years.default);
  const [showList, setShowList] = useState(false);
  const [query, setQuery] = useState("");
  const [missionLink, setMissionLink] = useDeepLink({
    hashPrefix: "field-mission",
  });
  const [selectedMission, linkedYear] = missionLink?.split("@") ?? [];
  const year = years.years.includes(Number(linkedYear))
    ? Number(linkedYear)
    : chartYear;
  const closeMission = () => {
    setYear(year);
    setMissionLink(null);
    clearSidebarHash();
  };
  const [entitiesData, setEntitiesData] =
    useState<SecretariatEntitiesData | null>(null);
  const [overview, setOverview] = useState<SecretariatOverviewData | null>(
    null,
  );
  const hasSelectedYear = overview?.meta.year === year;
  const openMission = (code: string) => {
    if (hasSelectedYear) navigateToSidebar("field-mission", `${code}@${year}`);
  };
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadStaticData<SecretariatEntitiesData>("secretariat-entities.json")
      .then((data) => {
        if (active) setEntitiesData(data);
      })
      .catch(() => {
        if (active) setLocationsError("Failed to load mission locations.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadYearData<SecretariatOverviewData>("secretariat-overview", year)
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {
        if (active)
          setOverviewError(`Failed to load ${year} mission expenditure.`);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const current = overview;
  const model = useMemo<FieldMissionModel | null>(() => {
    if (!current || !entitiesData) return null;

    const financial = buildFieldMissionModel(current, entitiesData, kinds);
    const points = financial.locatedMissions.map(
      ({ location, amount, group }) => ({
        lat: location.lat,
        long: location.long,
        radius: proportionalAreaRadiusInput(amount),
        color: group,
        label: location.code,
        data: { location, amount, group },
      }),
    );

    return { ...financial, points };
  }, [current, entitiesData, kinds]);

  if (!model || !entitiesData) {
    return (
      <div className="flex h-[36rem] items-center justify-center bg-gray-50 text-gray-500">
        {locationsError ?? overviewError ?? "Loading field mission data…"}
      </div>
    );
  }

  const showComposition = kinds.includes("spm") && kinds.includes("pko");
  const kindColors = kinds.map((group) => model.groups[group].color);
  const selectedPoint = hasSelectedYear
    ? model.points.find((point) => point.label === selectedMission)
    : undefined;
  const missionList = [...model.points].filter((point) =>
    `${point.label} ${point.data.location.name}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <div className="relative w-full">
      <DelayedChartLoading pending={!hasSelectedYear} requestKey={year} />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <BinaryToggle
          variant="segmented"
          label="Field mission view"
          options={[
            { value: "map", label: "Map" },
            { value: "list", label: "List" },
          ]}
          value={showList ? "list" : "map"}
          onValueChange={(value) => setShowList(value === "list")}
        />
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={(nextYear) => {
            setOverviewError(null);
            setYear(nextYear);
          }}
        />
        {showList && (
          <ChartSearchInput
            label="Search missions"
            placeholder="Search missions…"
            value={query}
            onChange={setQuery}
          />
        )}
      </div>

      {showComposition && (
        <SecretariatGroupBar groups={model.groups} amounts={model.totals} />
      )}

      {showComposition && (
        <div className="relative h-14" aria-hidden="true">
          <svg
            viewBox="0 0 100 56"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            {model.connectors.map((connector) => (
              <g key={connector.group}>
                <polygon
                  points={`${connector.start},0 ${connector.end},0 ${connector.expandedEnd},56 ${connector.expandedStart},56`}
                  fill={CONNECTOR_FILL}
                  fillOpacity="0.3"
                />
                <line
                  x1={connector.start}
                  y1="0"
                  x2={connector.expandedStart}
                  y2="56"
                  stroke={CONNECTOR_STROKE}
                  strokeOpacity="0.55"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={connector.end}
                  y1="0"
                  x2={connector.expandedEnd}
                  y2="56"
                  stroke={CONNECTOR_STROKE}
                  strokeOpacity="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>
        </div>
      )}

      {showList ? (
        <RankedDetailList
          label="Field mission expenditure"
          items={missionList.map((point) => ({
            id: point.label,
            label: point.data.location.name,
            description: point.label,
            amount: point.data.amount,
            value: formatBudget(point.data.amount),
            group: {
              key: point.data.group,
              label: model.groups[point.data.group].label,
            },
            color: model.groups[point.data.group].color,
            onOpen: () => openMission(point.label),
          }))}
        />
      ) : (
        <MapInteraction>
          <div className="relative border border-gray-200 bg-white">
            <div
              className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-sm border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-sm"
              aria-label="Mission type legend"
            >
              {kinds.map((group) => (
                <span key={group} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: model.groups[group].color }}
                    aria-hidden="true"
                  />
                  {model.groups[group].label}
                </span>
              ))}
            </div>
            <DotDensityMap
              data={model.points}
              colorDomain={[...kinds]}
              colors={kindColors}
              radius={MAX_MISSION_RADIUS_PX}
              maxRadiusValue={1}
              mapProjection="equalEarth"
              scale={1.15}
              centerPoint={[0, 6]}
              zoomInteraction="button"
              mapBorderWidth={0.5}
              mapBorderColor="#d1d5db"
              mapNoDataColor="#f3f4f6"
              height={mapHeight}
              padding="0px"
              showAntarctica={false}
              isWorldMap
              showColorScale={false}
              showLabels={false}
              footNote=""
              ariaLabel={
                kinds.includes("spm") && kinds.includes("pko")
                  ? `Map of special political mission and peacekeeping operation expenditure in ${year}`
                  : kinds.includes("pko")
                    ? `Map of peacekeeping operation expenditure in ${year}`
                    : `Map of special political mission expenditure in ${year}`
              }
              onSeriesMouseClick={(point: MissionPoint | undefined) => {
                if (point) openMission(point.label);
              }}
              tooltip={(point: MissionPoint) => (
                <FinancialTooltip
                  title={`${point.data.location.code} · ${point.data.location.name}`}
                  parents={[{ label: model.groups[point.data.group].label }]}
                  context={missionLocationLabel(point.data.location)}
                  total={{
                    label: "Expenditure",
                    value: formatBudget(point.data.amount),
                  }}
                />
              )}
              styles={{
                tooltip: {
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  boxShadow:
                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                },
              }}
            />
          </div>
        </MapInteraction>
      )}

      {selectedPoint && overview && (
        <DetailDrawer
          titleId="field-mission-title"
          onClose={closeMission}
          className="overflow-y-auto sm:w-[32rem]"
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id="field-mission-title" className="text-xl font-bold">
                <DrawerTitle>
                  {selectedPoint.label} · {selectedPoint.data.location.name}
                </DrawerTitle>
              </h2>
              <SidebarControls
                onClose={closeMission}
                closeLabel="Close mission details"
                shareHash={`field-mission=${encodeURIComponent(missionLink ?? "")}`}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {model.groups[selectedPoint.data.group].label}
            </p>
            <p className="mt-2 text-sm">
              {missionLocationLabel(selectedPoint.data.location)}
            </p>
            <dl className="mt-4">
              <dt>Expenditure in {overview.meta.year}</dt>
              <dd className="text-xl font-bold tabular-nums">
                {formatBudget(selectedPoint.data.amount)}
              </dd>
            </dl>
          </div>
        </DetailDrawer>
      )}

      <div className="mt-3 text-xs leading-relaxed text-gray-500">
        <p className="mb-2 max-w-2xl">
          Groups cover all Secretariat expenditure. The map shows positive
          expenditure for mission entities with geographic locations. Support
          offices and bodies without a geographic location are outside this map.
        </p>
        <div className="max-w-2xl space-y-2" data-map-notes>
          <p>{entitiesData.map_notes.placement}</p>
          {!showList && <MapBoundaryDisclaimer />}
        </div>
      </div>
    </div>
  );
}
