"use client";

import { useEffect, useMemo, useState } from "react";
import { DotDensityMap } from "@undp/data-viz";
import { SecretariatGroupBar } from "@/components/SecretariatStackedBar";
import { YearSlider } from "@/components/YearSlider";
import { loadStaticData, loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  SecretariatEntitiesData,
  SecretariatGroup,
  SecretariatMissionLocation,
  SecretariatOverviewData,
} from "@/types";

type MappedGroup = Extract<SecretariatGroup, "spm" | "pko">;
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
  const years = useYearRanges().secretariatOverview;
  const [year, setYear] = useState(years.default);
  const [entitiesData, setEntitiesData] =
    useState<SecretariatEntitiesData | null>(null);
  const [overview, setOverview] = useState<SecretariatOverviewData | null>(
    null,
  );
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
          setOverviewError(`Failed to load ${year} mission expenses.`);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const current = overview?.meta.year === year ? overview : null;
  const model = useMemo<FieldMissionModel | null>(() => {
    if (!current || !entitiesData) return null;

    const totals = Object.fromEntries(
      (Object.keys(current.meta.groups) as SecretariatGroup[]).map((group) => [
        group,
        0,
      ]),
    ) as FieldMissionModel["totals"];
    const amountsByCanonicalCode = new Map<string, number>();

    for (const entity of current.entities) {
      totals[entity.group] += entity.total;
      const canonicalCode = entitiesData.aliases[entity.code] ?? entity.code;
      amountsByCanonicalCode.set(
        canonicalCode,
        (amountsByCanonicalCode.get(canonicalCode) ?? 0) + entity.total,
      );
    }

    const locatedMissions = entitiesData.locations
      .filter(
        (
          location,
        ): location is SecretariatMissionLocation & {
          kind: MappedGroup;
        } => kinds.includes(location.kind as MappedGroup),
      )
      .map((location) => ({
        location,
        amount: amountsByCanonicalCode.get(location.code) ?? 0,
      }))
      .filter(({ amount }) => amount > 0)
      .sort(
        (a, b) =>
          b.amount - a.amount || a.location.code.localeCompare(b.location.code),
      );
    const points = locatedMissions.map(({ location, amount }) => ({
      lat: location.lat,
      long: location.long,
      radius: proportionalAreaRadiusInput(amount),
      color: location.kind,
      label: location.code,
      data: { location, amount, group: location.kind },
    }));

    return { totals, points };
  }, [current, entitiesData, kinds]);

  if (!model || !entitiesData) {
    return (
      <div className="flex h-[36rem] items-center justify-center bg-gray-50 text-gray-500">
        {locationsError ?? overviewError ?? "Loading field mission data…"}
      </div>
    );
  }

  const boxGroups = (
    Object.entries(entitiesData.groups) as Array<
      [SecretariatGroup, (typeof entitiesData.groups)[SecretariatGroup]]
    >
  )
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([group]) => group);
  const boxTotal = boxGroups.reduce(
    (sum, group) => sum + model.totals[group],
    0,
  );
  const showComposition = kinds.includes("spm") && kinds.includes("pko");
  const missionTotal = model.totals.spm + model.totals.pko;
  const secretariatEnd = (model.totals.secretariat / boxTotal) * 100;
  const spmEnd =
    ((model.totals.secretariat + model.totals.spm) / boxTotal) * 100;
  const pkoEnd =
    ((model.totals.secretariat + model.totals.spm + model.totals.pko) /
      boxTotal) *
    100;
  const expandedSpmEnd = (model.totals.spm / missionTotal) * 100;
  const kindColors = kinds.map((group) => entitiesData.groups[group].color);

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-end">
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={(nextYear) => {
            setOverviewError(null);
            setYear(nextYear);
          }}
        />
      </div>

      {showComposition && (
        <SecretariatGroupBar
          groups={entitiesData.groups}
          amounts={model.totals}
        />
      )}

      {showComposition && (
        <div className="relative h-14" aria-hidden="true">
          <svg
            viewBox="0 0 100 56"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <polygon
              points={`${secretariatEnd},0 ${spmEnd},0 ${expandedSpmEnd},56 0,56`}
              fill={CONNECTOR_FILL}
              fillOpacity="0.3"
            />
            <polygon
              points={`${spmEnd},0 ${pkoEnd},0 100,56 ${expandedSpmEnd},56`}
              fill={CONNECTOR_FILL}
              fillOpacity="0.3"
            />
            <line
              x1={secretariatEnd}
              y1="0"
              x2="0"
              y2="56"
              stroke={CONNECTOR_STROKE}
              strokeOpacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={pkoEnd}
              y1="0"
              x2="100"
              y2="56"
              stroke={CONNECTOR_STROKE}
              strokeOpacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}

      <div className="relative border border-gray-200 bg-white">
        <div
          className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-sm border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-sm"
          aria-label="Mission type legend"
        >
          {kinds.map((group) => (
            <span key={group} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entitiesData.groups[group].color }}
                aria-hidden="true"
              />
              {entitiesData.groups[group].label}
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
          height={520}
          padding="0px"
          showAntarctica={false}
          isWorldMap
          showColorScale={false}
          showLabels={false}
          footNote=""
          ariaLabel={
            kinds.includes("spm") && kinds.includes("pko")
              ? `Map of special political mission and peacekeeping operation expenses in ${year}`
              : kinds.includes("pko")
                ? `Map of peacekeeping operation expenses in ${year}`
                : `Map of special political mission expenses in ${year}`
          }
          tooltip={(point: MissionPoint) => (
            <div style={{ maxWidth: "260px", padding: "4px" }}>
              <p
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {point.data.location.code}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  color: "#475569",
                  fontSize: "12px",
                  lineHeight: 1.35,
                }}
              >
                {point.data.location.name}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                {entitiesData.groups[point.data.group].label} ·{" "}
                {point.data.location.area}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {formatBudget(point.data.amount)}
              </p>
            </div>
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

      <div className="mt-3 text-xs leading-relaxed text-gray-500">
        <details className="max-w-2xl">
          <summary className="cursor-pointer text-un-blue">
            Map placement and boundary notes
          </summary>
          <div className="mt-2 space-y-2">
            <p>{entitiesData.map_notes.placement}</p>
            <p>{entitiesData.map_notes.boundary_disclaimer}</p>
            {model.points.some(
              (point) => point.data.location.code === "UNMOGIP",
            ) && <p>{entitiesData.map_notes.kashmir_disclaimer}</p>}
          </div>
        </details>
      </div>
    </div>
  );
}
