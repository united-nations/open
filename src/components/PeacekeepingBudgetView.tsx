"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DotDensityMap } from "@undp/data-viz";
import { PeacekeepingMissionSidebar } from "@/components/PeacekeepingMissionSidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClickHint } from "@/components/ui/ClickHint";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { loadStaticData, loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import {
  COST_CLASS_BAND_COLORS,
  COST_CLASS_KEYS,
  COST_CLASS_SHORT,
  fiscalYearLabel,
  type CostClassKey,
} from "@/lib/budgetGroupings";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  BudgetData,
  BudgetNode,
  SecretariatEntitiesData,
  SecretariatMissionLocation,
} from "@/types";

type PointKind = "pko" | "support";

const FIELD_COLOR = "#009edb";
const SUPPORT_COLOR = "#a0665c";
const KIND_LABEL: Record<PointKind, string> = {
  pko: "Field mission",
  support: "Support centre",
};

const MAX_MISSION_RADIUS_PX = 28;
const UNDP_MIN_RADIUS_PX = 0.25;
const DOLLARS_PER_RADIUS_PIXEL_SQUARED = 1_500_000;

function proportionalAreaRadiusInput(amount: number) {
  const renderedRadius = Math.sqrt(amount / DOLLARS_PER_RADIUS_PIXEL_SQUARED);
  const scalePosition =
    (renderedRadius - UNDP_MIN_RADIUS_PX) /
    (MAX_MISSION_RADIUS_PX - UNDP_MIN_RADIUS_PX);
  return Math.sign(scalePosition) * scalePosition ** 2;
}

function resolveLocation(
  code: string,
  entities: SecretariatEntitiesData,
): SecretariatMissionLocation | undefined {
  const byCode = new Map(
    entities.locations.map((location) => [location.code, location]),
  );
  if (byCode.has(code)) return byCode.get(code);
  const aliased = entities.aliases[code];
  if (aliased && byCode.has(aliased)) return byCode.get(aliased);
  return undefined;
}

function pointKind(
  code: string,
  location: SecretariatMissionLocation | undefined,
): PointKind {
  if (location?.kind === "support") return "support";
  if (code === "RSCE" || code === "UNGSC" || code === "UNLB" || code === "UNSOS") {
    return "support";
  }
  return "pko";
}

interface MissionRow {
  code: string;
  name: string;
  location: SecretariatMissionLocation | undefined;
  kind: PointKind;
  total: number;
  classes: Record<CostClassKey, number | null>;
  source: BudgetNode["source"];
}

function buildRows(data: BudgetData, entities: SecretariatEntitiesData) {
  const missions = data.nodes.filter(
    (node) => node.tier === "mission" && node.costClass === "total",
  );
  const classNodes = data.nodes.filter((node) => node.tier === "class");
  const rows: MissionRow[] = missions.map((mission) => {
    const code = mission.code ?? mission.mission ?? mission.id;
    const location = resolveLocation(code, entities);
    const classes = Object.fromEntries(
      COST_CLASS_KEYS.map((key) => {
        const match = classNodes.find(
          (node) => node.mission === code && node.costClass === key,
        );
        return [key, match ? match.amount : null];
      }),
    ) as Record<CostClassKey, number | null>;
    return {
      code,
      name: mission.label,
      location,
      kind: pointKind(code, location),
      total: mission.amount,
      classes,
      source: mission.source,
    };
  });
  rows.sort(
    (a, b) => b.total - a.total || a.code.localeCompare(b.code),
  );
  return rows;
}

interface MapPoint {
  lat: number;
  long: number;
  radius: number;
  color: PointKind;
  label: string;
  data: MissionRow;
}

function MoneyBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? (Math.max(0, value) / max) * 100 : 0;
  const label = formatBudget(value);
  return (
    <Tooltip delayDuration={50}>
      <TooltipTrigger asChild>
        <div
          className="h-4 w-full min-w-[4.5rem] bg-gray-100"
          aria-label={label}
        >
          <div
            className="h-full"
            style={{ width: `${width}%`, backgroundColor: color }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="border border-slate-200 bg-white text-slate-800 shadow-lg"
      >
        <p className="text-sm font-semibold">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function DistributionBar({
  classes,
}: {
  classes: Record<CostClassKey, number | null>;
}) {
  const parts = COST_CLASS_KEYS.flatMap((key) => {
    const value = classes[key];
    if (value === null || value <= 0) return [];
    return [
      {
        key,
        value,
        color: COST_CLASS_BAND_COLORS[key]?.bg ?? "#6b7280",
        label: COST_CLASS_SHORT[key] ?? key,
      },
    ];
  });
  const sum = parts.reduce((total, part) => total + part.value, 0);
  if (sum <= 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const ariaLabel = parts
    .map(
      (part) =>
        `${part.label}: ${formatBudget(part.value)} (${((part.value / sum) * 100).toFixed(0)}%)`,
    )
    .join(" · ");
  return (
    <Tooltip delayDuration={50}>
      <TooltipTrigger asChild>
        <div
          className="flex h-4 w-full min-w-[8rem] overflow-hidden bg-gray-100"
          aria-label={ariaLabel}
        >
          {parts.map((part) => (
            <div
              key={part.key}
              className="h-full"
              style={{
                width: `${(part.value / sum) * 100}%`,
                backgroundColor: part.color,
              }}
            />
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="border border-slate-200 bg-white text-slate-800 shadow-lg"
      >
        <ul className="space-y-1 text-xs">
          {parts.map((part) => (
            <li key={part.key} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0"
                style={{ backgroundColor: part.color }}
                aria-hidden="true"
              />
              <span>
                {part.label}: {formatBudget(part.value)} (
                {((part.value / sum) * 100).toFixed(0)}%)
              </span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function PeacekeepingBudgetView() {
  const years = useYearRanges().budgetPko;
  const [year, setYear] = useState(years.default);
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [entities, setEntities] = useState<SecretariatEntitiesData | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "pko-mission",
    sectionId: "peacekeeping-spending",
    onNavigateAway: () => setSelectedCode(null),
  });

  const openMission = useCallback((code: string) => {
    setSelectedCode(code);
    replaceToSidebar("pko-mission", code);
  }, []);

  useEffect(() => {
    let active = true;
    loadStaticData<SecretariatEntitiesData>("secretariat-entities.json")
      .then((data) => {
        if (active) setEntities(data);
      })
      .catch(() => {
        if (active) setError("Failed to load mission locations.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadYearData<BudgetData>("budget-pko", year)
      .then((data) => {
        if (active) {
          setError(null);
          setBudget(data);
        }
      })
      .catch(() => {
        if (active) setError(`Failed to load ${fiscalYearLabel(year)} data.`);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const current = budget?.meta.year === year ? budget : null;
  const rows = useMemo(() => {
    if (!current || !entities) return [];
    return buildRows(current, entities);
  }, [current, entities]);

  useEffect(() => {
    if (!pending) return;
    setSelectedCode(pending);
    setPending(null);
  }, [pending, setPending]);

  const points = useMemo<MapPoint[]>(() => {
    return rows
      .filter((row) => row.location)
      .map((row) => ({
        lat: row.location!.lat,
        long: row.location!.long,
        radius: proportionalAreaRadiusInput(row.total),
        color: row.kind,
        label: row.code,
        data: row,
      }));
  }, [rows]);

  if (!current || !entities) {
    return (
      <div className="flex h-[36rem] items-center justify-center bg-gray-50 text-gray-500">
        {error ?? "Loading peacekeeping budget…"}
      </div>
    );
  }

  const maxTotal = rows.reduce((max, row) => Math.max(max, row.total), 0);
  const selectedRow = rows.find((row) => row.code === selectedCode);
  const selectedLocation =
    selectedCode && entities
      ? resolveLocation(selectedCode, entities)
      : undefined;

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-end">
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={setYear}
          formatLabel={fiscalYearLabel}
        />
      </div>

      <div className="relative border border-gray-200 bg-white">
        <div
          className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-sm border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-sm"
          aria-label="Mission type legend"
        >
          {(["pko", "support"] as const).map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: kind === "pko" ? FIELD_COLOR : SUPPORT_COLOR,
                }}
                aria-hidden="true"
              />
              {KIND_LABEL[kind]}
            </span>
          ))}
        </div>
        <DotDensityMap
          data={points}
          colorDomain={["pko", "support"]}
          colors={[FIELD_COLOR, SUPPORT_COLOR]}
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
          resetSelectionOnDoubleClick={false}
          highlightedDataPoints={selectedCode ? [selectedCode] : []}
          onSeriesMouseClick={(point: MapPoint | undefined) => {
            const code =
              point?.data?.code ??
              (typeof point?.label === "string" ? point.label : undefined);
            if (code) openMission(code);
          }}
          ariaLabel={`Map of peacekeeping budget expenditure in ${current.meta.fiscalYear}`}
          tooltip={(point: MapPoint) => (
            <div style={{ maxWidth: "260px", padding: "4px" }}>
              <p
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {point.data.code}
              </p>
              <p
                style={{
                  margin: "3px 0 0",
                  color: "#475569",
                  fontSize: "12px",
                  lineHeight: 1.35,
                }}
              >
                {point.data.name}
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                {KIND_LABEL[point.data.kind]}
                {point.data.location
                  ? ` · ${point.data.location.area}`
                  : ""}
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {formatBudget(point.data.total)}
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
      <ClickHint text="Click a mission for details" />

      <div className="mt-3 text-xs leading-relaxed text-gray-500">
        <details className="max-w-2xl">
          <summary className="cursor-pointer text-un-blue">
            Map placement and boundary notes
          </summary>
          <div className="mt-2 space-y-2">
            <p>{entities.map_notes.placement}</p>
            <p>{entities.map_notes.boundary_disclaimer}</p>
          </div>
        </details>
      </div>

      <div className="mt-10">
        <h3 className="mb-2 text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Mission expenditure · {current.meta.fiscalYear}
        </h3>
        <p className="mb-4 max-w-3xl text-xs leading-relaxed text-gray-500">
          {current.meta.scopeWarning}
        </p>
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {COST_CLASS_KEYS.map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0"
                style={{
                  backgroundColor: COST_CLASS_BAND_COLORS[key]?.bg ?? "#6b7280",
                }}
                aria-hidden="true"
              />
              {COST_CLASS_SHORT[key] ?? key}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="sr-only">
              Peacekeeping mission expenditure by cost class for{" "}
              {current.meta.fiscalYear}
            </caption>
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pr-3 font-medium">Mission</th>
                <th className="py-2 pr-3 font-medium">Location</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="w-[28%] py-2 pr-3 font-medium">Distribution</th>
                <th className="w-[16%] py-2 pr-3 font-medium">Total</th>
                <th className="py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.code}
                  className={`cursor-pointer border-b border-gray-100 align-middle hover:bg-gray-50 ${selectedCode === row.code ? "bg-sky-50" : ""}`}
                  onClick={() => openMission(row.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openMission(row.code);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Open details for ${row.code}`}
                >
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-gray-900">
                      {row.code}
                    </div>
                    <div className="text-xs leading-snug text-gray-600">
                      {row.name}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">
                    {row.location?.area ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">
                    {KIND_LABEL[row.kind]}
                  </td>
                  <td className="py-2.5 pr-3">
                    <DistributionBar classes={row.classes} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <MoneyBar
                      value={row.total}
                      max={maxTotal}
                      color="#1f2937"
                    />
                  </td>
                  <td className="py-2.5">
                    {row.source?.url && row.source.symbol ? (
                      <a
                        href={row.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="whitespace-nowrap text-un-blue hover:underline"
                      >
                        {row.source.symbol}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCode && (
        <PeacekeepingMissionSidebar
          key={selectedCode}
          code={selectedCode}
          name={selectedRow?.name ?? selectedLocation?.name ?? selectedCode}
          kindLabel={
            selectedRow
              ? KIND_LABEL[selectedRow.kind]
              : selectedLocation?.kind === "support"
                ? KIND_LABEL.support
                : KIND_LABEL.pko
          }
          locationLabel={
            selectedRow?.location?.area ?? selectedLocation?.area ?? null
          }
          fiscalYear={current.meta.fiscalYear}
          total={selectedRow ? selectedRow.total : null}
          classes={selectedRow ? selectedRow.classes : null}
          source={selectedRow?.source}
          onClose={() => {
            setSelectedCode(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
