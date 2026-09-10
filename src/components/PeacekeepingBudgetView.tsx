"use client";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DotDensityMap } from "@undp/data-viz/DotDensityMap";
import { PeacekeepingMissionSidebar } from "@/components/PeacekeepingMissionSidebar";
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
  if (
    code === "RSCE" ||
    code === "UNGSC" ||
    code === "UNLB" ||
    code === "UNSOS"
  ) {
    return "support";
  }
  return "pko";
}

interface CostItem {
  label: string;
  amount: number;
}

interface MissionRow {
  code: string;
  name: string;
  location: SecretariatMissionLocation | undefined;
  kind: PointKind;
  total: number;
  classes: Record<CostClassKey, number | null>;
  items: Record<CostClassKey, CostItem[]>;
  source: BudgetNode["source"];
}

interface MissionCostClassLeaf {
  mission: MissionRow;
  costClass: CostClassKey;
}

function buildRows(data: BudgetData, entities: SecretariatEntitiesData) {
  const missions = data.nodes.filter(
    (node) => node.tier === "mission" && node.costClass === "total",
  );
  const classNodes = data.nodes.filter((node) => node.tier === "class");
  const itemNodes = data.nodes.filter((node) => node.tier === "item");
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
    const items = Object.fromEntries(
      COST_CLASS_KEYS.map((key) => {
        const lines = itemNodes
          .filter((node) => node.mission === code && node.costClass === key)
          .map((node) => ({ label: node.label, amount: node.amount }))
          .sort(
            (a, b) => b.amount - a.amount || a.label.localeCompare(b.label),
          );
        return [key, lines];
      }),
    ) as Record<CostClassKey, CostItem[]>;
    return {
      code,
      name: mission.label,
      location,
      kind: pointKind(code, location),
      total: mission.amount,
      classes,
      items,
      source: mission.source,
    };
  });
  rows.sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
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

function MissionCostClassTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<
    MissionRow,
    never,
    MissionCostClassLeaf,
    never
  >;
}) {
  const leaf = context.leaf.data;
  if (!leaf) return null;
  const missing = COST_CLASS_KEYS.filter(
    (key) => leaf.mission.classes[key] === null,
  );
  const zero = COST_CLASS_KEYS.filter(
    (key) => leaf.mission.classes[key] === 0,
  );
  return (
    <div className="space-y-1">
      <p className="font-semibold">
        {leaf.mission.code} · {leaf.mission.name}
      </p>
      <p>
        {COST_CLASS_SHORT[leaf.costClass] ?? leaf.costClass}: {formatBudget(
          context.leaf.value,
        )}
      </p>
      {missing.length > 0 && (
        <p className="opacity-75">
          Not published: {missing
            .map((key) => COST_CLASS_SHORT[key] ?? key)
            .join(", ")}
        </p>
      )}
      {zero.length > 0 && (
        <p className="opacity-75">
          Published as $0: {zero
            .map((key) => COST_CLASS_SHORT[key] ?? key)
            .join(", ")}
        </p>
      )}
      <p className="opacity-75">Click for mission details</p>
    </div>
  );
}

function MissionCostClassTreemap({
  rows,
  onOpen,
}: {
  rows: MissionRow[];
  onOpen: (code: string) => void;
}) {
  const treemapRows = rows.flatMap((mission) => {
    if (mission.total <= 0) return [];
    const leaves = COST_CLASS_KEYS.flatMap((costClass) => {
      const amount = mission.classes[costClass];
      if (amount === null || amount <= 0) return [];
      return [
        {
          key: costClass,
          label: COST_CLASS_SHORT[costClass] ?? costClass,
          value: amount,
          color: mission.kind === "support" ? "var(--color-faded-jade)" : "var(--color-un-blue)",
          data: { mission, costClass },
          onActivate: () => onOpen(mission.code),
        },
      ];
    });
    return [
      {
        key: mission.code,
        label: mission.code,
        color: mission.kind === "support" ? "var(--color-faded-jade)" : "var(--color-un-blue)",
        data: mission,
        leaves,
      } satisfies GroupedTreemapRow<
        MissionRow,
        never,
        MissionCostClassLeaf,
        never
      >,
    ];
  });

  return (
    <div>
      <GroupedTreemap<
        MissionRow,
        never,
        MissionCostClassLeaf,
        never
      >
        rows={treemapRows}
        totalLabel="Total"
        plotClassName="h-[34rem] sm:h-[42rem] lg:h-[48rem]"
        formatValue={(value) => formatBudget(value)}
        formatAccessibleValue={(value) => formatBudget(value)}
        showLeafValues
        renderTooltip={(context) => (
          <MissionCostClassTooltip context={context} />
        )}
      />

    </div>
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

  const selectedRow = rows.find((row) => row.code === selectedCode);
  const selectedLocation =
    selectedCode && entities
      ? resolveLocation(selectedCode, entities)
      : undefined;

  return (
    <div className="flex w-full flex-col">
      <div className="mb-3 flex justify-end">
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={setYear}
          formatLabel={fiscalYearLabel}
        />
      </div>

      <section className="order-1">
        <div aria-label="Mission type legend" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 bg-un-blue" />
            Peacekeeping missions
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 bg-faded-jade" />
            Support missions
          </span>
        </div>
        <MissionCostClassTreemap
          rows={rows}
          onOpen={openMission}
        />
      </section>

      <section className="order-3 mt-10">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Mission locations · {current.meta.fiscalYear}
        </h3>
        <div className="pko-dot-map relative border border-gray-200 bg-white">
          <div
            className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-sm border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-sm"
            aria-label="Mission type legend"
          >
            {(["pko", "support"] as const).map((kind) => {
              const color = kind === "pko" ? FIELD_COLOR : SUPPORT_COLOR;
              return (
                <span key={kind} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: `${color}47`,
                      boxShadow: `inset 0 0 0 1.5px ${color}`,
                    }}
                    aria-hidden="true"
                  />
                  {KIND_LABEL[kind]}
                </span>
              );
            })}
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
                  {point.data.location ? ` · ${point.data.location.area}` : ""}
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
      </section>

      {selectedCode && (
        <div className="order-4">
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
            items={selectedRow ? selectedRow.items : null}
            source={selectedRow?.source}
            onClose={() => {
              setSelectedCode(null);
              clearSidebarHash();
            }}
          />
        </div>
      )}
    </div>
  );
}
