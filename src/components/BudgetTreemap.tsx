"use client";

// Budget-document treemap for /secretariat, in the layout of ../budget-explorer:
// the groups are stacked as bands whose height is their share of the budget, the
// level below is squarified inside its band, and the tiles are the lowest rows
// the documents print. The band names sit in a column beside the chart rather
// than in a legend below it.
//
//   PPB          part band -> section -> budget unit (the tiles: one level, the
//                same kind of thing in every section, named after the
//                organization the budget ties it to where it names one)
//   detailed PKO mission band -> cost class -> cost item, or the same the other
//                way round when the lens is switched
//   audited PKO  mission band -> mission total
//
// Data: public/data/budget-*.json. Python/11 writes the audited trees and
// python/12 writes the programme-budget-data trees. Both use one node contract.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, SplitSquareHorizontal } from "lucide-react";
import type { BudgetData, BudgetNode } from "@/types";
import {
  useDeepLink,
  replaceToSidebar,
  clearSidebarHash,
} from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import { BudgetSidebar } from "@/components/BudgetSidebar";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { Switch } from "@/components/ui/switch";
import { YearSlider } from "@/components/YearSlider";
import { useYearRanges } from "@/lib/useYearRanges";
import { squarifyDense, type TreemapItem } from "@/lib/treemapLayout";
import {
  auditedFiscalYearLabel,
  BUDGET_FUNDING_SOURCES,
  COST_CLASS_BAND_COLORS,
  COST_CLASS_SHORT,
  costClassStyles,
  fiscalYearLabel,
  FUNDING_SOURCES,
  unitCaption,
  unitExplanation,
  unitSearchText,
  type BudgetFundingSource,
  type PkoLens,
} from "@/lib/budgetGroupings";
import {
  BAND_PALETTE,
  budgetPartStyles,
  PART_BAND_COLORS,
  PART_SHORT_NAMES,
} from "@/lib/secretariatGroupings";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Gap between two bands, in pixels. */
const BAND_GAP = 2;
const LABEL_GAP = 2;
const COMPACT_LABEL_HEIGHT = 14;
const STACKED_LABEL_HEIGHT = 31;
const COMPACT_PROGRAMME_PARTS = new Set([
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
]);

const FUNDING_SHADE_OPACITY: Record<BudgetFundingSource, number> = {
  regular_budget: 1,
  other_assessed: 1,
  extrabudgetary: 0.85,
};

function positiveFundingValues(
  node: BudgetNode,
): [BudgetFundingSource, number][] {
  return BUDGET_FUNDING_SOURCES.map(
    (key) => [key, node.values?.[key] ?? 0] as [BudgetFundingSource, number],
  ).filter(([, amount]) => amount > 0);
}

interface Tile {
  node: BudgetNode;
  caption: string;
  variance: number | null;
  appearsInMultipleLocations: boolean;
}

interface Group {
  key: string;
  total: number;
  tiles: Tile[];
}

interface Band {
  key: string;
  /** The numeral of a budget part; empty for a mission or a cost class. */
  caption: string;
  name: string;
  total: number;
  variance: number | null;
  groups: Group[];
  colors: { bg: string; hover: string };
}

interface BandLayout {
  band: Band;
  startY: number;
  height: number;
}

interface BandLabelPosition {
  band: Band;
  y: number;
  compact: boolean;
  height: number;
}

/**
 * Keep every side label legible while preserving its band's vertical anchor.
 * Mission lists use the same compact row as the small programme-budget parts;
 * the three cost-class labels and larger programme parts retain two rows.
 */
function layoutBandLabels(
  bandLayout: BandLayout[],
  canvasHeight: number,
): BandLabelPosition[] {
  const positions = bandLayout.map(({ band, startY }) => {
    const compact =
      COMPACT_PROGRAMME_PARTS.has(band.caption) ||
      (band.caption === "" && bandLayout.length > 3);
    return {
      band,
      y: (startY / 100) * canvasHeight,
      compact,
      height: compact ? COMPACT_LABEL_HEIGHT : STACKED_LABEL_HEIGHT,
    };
  });

  // First move collisions down, then work back from the canvas edge. This
  // gives the same collision rule to PPB, audited PPB and both PKO lenses.
  for (let i = 1; i < positions.length; i++) {
    const minimumY = positions[i - 1].y + positions[i - 1].height + LABEL_GAP;
    positions[i].y = Math.max(positions[i].y, minimumY);
  }
  for (let i = positions.length - 1; i >= 0; i--) {
    const maximumY =
      i === positions.length - 1
        ? canvasHeight - positions[i].height
        : positions[i + 1].y - LABEL_GAP - positions[i].height;
    positions[i].y = Math.min(positions[i].y, maximumY);
  }

  return positions;
}

/** "↗3.2%", with a variation selector so iOS draws an arrow, not an emoji. */
function formatVariance(value: number | null): string {
  if (value === null) return "";
  const arrow = value > 0 ? "↗︎" : value < 0 ? "↘︎" : "→︎";
  return `${arrow}${Math.abs(value).toFixed(1)}%`;
}

function percentChange(
  current: number,
  before: number | undefined,
): number | null {
  if (before === undefined || before <= 0) return null;
  return ((current - before) / before) * 100;
}

interface BudgetTreemapProps {
  /** Dataset in public/data: one file per year, `{dataset}-{year}.json`. */
  dataset:
    | "budget-ppb"
    | "budget-pko"
    | "budget-audited-ppb"
    | "budget-audited-pko";
  /** Hash prefix for deep links, e.g. "secretariat" or "pko". */
  hashPrefix: string;
  /** Section to scroll to when a deep link opens. */
  sectionId: string;
  /** Funding sources included in the boxes, chart and sidebar. */
  activeFundingSources: BudgetFundingSource[];
  /** Reports the filtered root total to the budget selector. */
  onTotalChange?: (total: number) => void;
}

export function BudgetTreemap({
  dataset,
  hashPrefix,
  sectionId,
  activeFundingSources,
  onTotalChange,
}: BudgetTreemapProps) {
  const yearRanges = useYearRanges();
  const isAudited = dataset.startsWith("budget-audited-");
  const isPko = dataset.endsWith("-pko");
  const yearLabel = isPko
    ? isAudited
      ? auditedFiscalYearLabel
      : fiscalYearLabel
    : undefined;
  const range =
    dataset === "budget-audited-ppb"
      ? yearRanges.budgetAuditedPpb
      : dataset === "budget-audited-pko"
        ? yearRanges.budgetAuditedPko
        : isPko
          ? yearRanges.budgetPko
          : yearRanges.budgetPpb;

  const [year, setYear] = useState<number>(range.default);
  const [data, setData] = useState<BudgetData | null>(null);
  // The year before, for the change figures beside the band names.
  const [previous, setPrevious] = useState<BudgetData | null>(null);
  const [lens, setLens] = useState<PkoLens>("mission");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(1200);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    tile: Tile;
  } | null>(null);

  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix,
    sectionId,
    onNavigateAway: () => setSelectedId(null),
  });

  useEffect(() => {
    let current = true;
    setLoading(true);
    // The year before stays on screen until the new one arrives, so that moving
    // the slider does not flash an empty box.
    fetch(`${basePath}/data/${dataset}-${year}.json`)
      .then((res) => res.json())
      .then((d: BudgetData) => {
        if (current) setData(d);
      })
      .catch((err) =>
        console.error(`Failed to load ${dataset}-${year}.json:`, err),
      )
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [dataset, year]);

  useEffect(() => {
    if (!range.years.includes(year - 1)) {
      setPrevious(null);
      return;
    }
    let current = true;
    fetch(`${basePath}/data/${dataset}-${year - 1}.json`)
      .then((res) => res.json())
      .then((d: BudgetData) => {
        if (current) setPrevious(d);
      })
      .catch(() => setPrevious(null));
    return () => {
      current = false;
    };
  }, [dataset, year, range.years]);

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setCanvasHeight(
        width < 640 ? (isExpanded ? 6000 : 2000) : width < 1024 ? 1600 : 1200,
      );
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [isExpanded]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeFundingSet = useMemo(
    () => new Set(activeFundingSources),
    [activeFundingSources],
  );

  const filterNode = useCallback(
    (node: BudgetNode): BudgetNode => {
      // The detailed PKO release predates the shared funding-source fields.
      // Its complete tree is separately assessed, so treat every amount as OA.
      const sourceValues =
        node.values && Object.keys(node.values).length > 0
          ? node.values
          : isPko
            ? { other_assessed: node.amount }
            : {};
      const values = Object.fromEntries(
        BUDGET_FUNDING_SOURCES.filter(
          (source) =>
            activeFundingSet.has(source) && sourceValues[source] != null,
        ).map((source) => [source, sourceValues[source] ?? 0]),
      );
      return {
        ...node,
        amount: Object.values(values).reduce((sum, amount) => sum + amount, 0),
        values,
      };
    },
    [activeFundingSet, isPko],
  );

  const filteredData = useMemo<BudgetData | null>(() => {
    if (!data) return null;
    const nodes = data.nodes.map(filterNode);
    const root = nodes.find((node) => node.parentId === null);
    const omitted = data.meta.omitted
      ?.map((item) => ({
        ...item,
        values: Object.fromEntries(
          Object.entries(item.values).filter(([source]) =>
            activeFundingSet.has(source as BudgetFundingSource),
          ),
        ),
      }))
      .filter((item) => Object.keys(item.values).length > 0);
    return {
      ...data,
      meta: {
        ...data.meta,
        total: root?.amount ?? 0,
        fundingSources: [...activeFundingSources],
        omitted,
      },
      nodes,
    };
  }, [activeFundingSet, activeFundingSources, data, filterNode]);

  const filteredPrevious = useMemo<BudgetData | null>(() => {
    if (!previous) return null;
    return { ...previous, nodes: previous.nodes.map(filterNode) };
  }, [filterNode, previous]);

  useEffect(() => {
    if (filteredData) onTotalChange?.(filteredData.meta.total);
  }, [filteredData, onTotalChange]);

  const byId = useMemo(() => {
    const map: Record<string, BudgetNode> = {};
    for (const n of filteredData?.nodes ?? []) map[n.id] = n;
    return map;
  }, [filteredData]);

  const childrenOf = useMemo(() => {
    const map: Record<string, BudgetNode[]> = {};
    for (const n of filteredData?.nodes ?? []) {
      if (n.parentId) (map[n.parentId] ??= []).push(n);
    }
    for (const list of Object.values(map))
      list.sort((a, b) => b.amount - a.amount);
    return map;
  }, [filteredData]);

  const previousAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of filteredPrevious?.nodes ?? []) map[n.id] = n.amount;
    return map;
  }, [filteredPrevious]);

  const entityPlacements = useMemo(() => {
    const placements: Record<string, Set<string>> = {};
    for (const node of filteredData?.nodes ?? []) {
      if (node.tier !== "budget_unit" || !node.entity || node.amount <= 0)
        continue;
      const key = node.entity.acronym ?? node.entity.name;
      // Catch-all accounting rows are not organizations and must not receive
      // the marker used for real entities funded through several sections.
      if (key.trim().toUpperCase() === "OTHER") continue;
      (placements[key] ??= new Set()).add(node.parentId ?? node.id);
    }
    return placements;
  }, [filteredData]);

  // Resolve a pending deep link once the data is there.
  useEffect(() => {
    if (pendingDeepLink && byId[pendingDeepLink]?.amount > 0) {
      setSelectedId(pendingDeepLink);
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, byId, setPendingDeepLink]);

  // A section, mission or component that the chosen year does not print has no
  // node: close the sidebar rather than leave the year before on screen.
  useEffect(() => {
    if (
      selectedId &&
      filteredData &&
      (!byId[selectedId] || byId[selectedId].amount <= 0)
    ) {
      setSelectedId(null);
      clearSidebarHash();
    }
  }, [selectedId, filteredData, byId]);

  const { bands, drawnTotal } = useMemo(() => {
    const empty = { bands: [] as Band[], drawnTotal: 0 };
    if (!filteredData) return empty;

    const query = searchQuery.trim().toLowerCase();
    const keep = (node: BudgetNode, extra = "") =>
      !query ||
      `${node.label} ${node.code ?? ""} ${extra}`.toLowerCase().includes(query);

    const tileOf = (node: BudgetNode, caption: string): Tile => ({
      node,
      caption,
      variance: percentChange(node.amount, previousAmounts[node.id]),
      appearsInMultipleLocations: node.entity
        ? (entityPlacements[node.entity.acronym ?? node.entity.name]?.size ??
            1) > 1
        : false,
    });

    const built: Band[] = [];

    if (!isPko) {
      // Part -> section -> budget unit. The tiles are one tier, so two tiles of
      // the same size mean the same thing wherever they sit in the chart.
      const parts = filteredData.nodes
        .filter((n) => n.tier === "part")
        .sort(
          (a, b) =>
            (budgetPartStyles[a.code ?? ""]?.order ?? 999) -
            (budgetPartStyles[b.code ?? ""]?.order ?? 999),
        );
      for (const [index, part] of parts.entries()) {
        const groups: Group[] = [];
        for (const section of childrenOf[part.id] ?? []) {
          const units = (childrenOf[section.id] ?? []).filter(
            (n) => n.tier === "budget_unit",
          );
          // A section the release does not divide into units is its own tile.
          const rows = units.length > 0 ? units : [section];
          const tiles = rows
            .filter((n) => n.amount > 0 && keep(n, unitSearchText(n, section)))
            .map((n) =>
              tileOf(
                n,
                n === section
                  ? `${section.code}. ${section.label}`
                  : unitCaption(n, section),
              ),
            );
          if (tiles.length === 0) continue;
          groups.push({
            key: section.id,
            total: tiles.reduce((s, t) => s + t.node.amount, 0),
            tiles: tiles.sort((a, b) => b.node.amount - a.node.amount),
          });
        }
        if (groups.length === 0) continue;
        const total = groups.reduce((s, g) => s + g.total, 0);
        const code = part.code ?? "";
        built.push({
          key: part.id,
          caption: code,
          name: PART_SHORT_NAMES[code] ?? part.label,
          total,
          variance: percentChange(part.amount, previousAmounts[part.id]),
          groups: groups.sort((a, b) => b.total - a.total),
          colors:
            PART_BAND_COLORS[code] ?? BAND_PALETTE[index % BAND_PALETTE.length],
        });
      }
      return {
        bands: built,
        drawnTotal: built.reduce((s, b) => s + b.total, 0),
      };
    }

    // Audited peacekeeping has mission totals but no cost-class hierarchy. Use
    // the same band renderer, with one shaded mission tile in each band.
    const detailedItems = filteredData.nodes.filter(
      (n) => n.kind === "item" && n.amount > 0,
    );
    if (detailedItems.length === 0) {
      const missions = filteredData.nodes
        .filter((n) => n.kind === "mission" && n.amount > 0)
        .filter((n) => keep(n))
        .sort((a, b) => b.amount - a.amount);
      for (const [index, mission] of missions.entries()) {
        const tile = tileOf(mission, mission.code ?? mission.label);
        built.push({
          key: mission.id,
          caption: "",
          name: mission.code ?? mission.label,
          total: mission.amount,
          variance: tile.variance,
          groups: [{ key: mission.id, total: mission.amount, tiles: [tile] }],
          colors: BAND_PALETTE[index % BAND_PALETTE.length],
        });
      }
      return {
        bands: built,
        drawnTotal: built.reduce((sum, band) => sum + band.total, 0),
      };
    }

    // Detailed peacekeeping: cost items banded by mission or by cost class,
    // and grouped by the other one.
    const items = detailedItems;
    const missionTotals: Record<string, number> = {};
    for (const n of filteredData.nodes) {
      if (n.kind === "mission") missionTotals[n.code ?? n.id] = n.amount;
    }
    const missionOrder = Object.keys(missionTotals).sort(
      (a, b) => missionTotals[b] - missionTotals[a],
    );

    const nest: Record<string, Record<string, Tile[]>> = {};
    for (const item of items) {
      if (!keep(item, `${item.mission ?? ""} ${item.costClass ?? ""}`))
        continue;
      const bandKey = lens === "mission" ? item.mission : item.costClass;
      const groupKey = lens === "mission" ? item.costClass : item.mission;
      if (!bandKey || !groupKey) continue;
      ((nest[bandKey] ??= {})[groupKey] ??= []).push(tileOf(item, item.label));
    }

    const bandKeys =
      lens === "mission" ? missionOrder : Object.keys(costClassStyles);
    for (const [index, bandKey] of bandKeys.entries()) {
      const groupsOf = nest[bandKey];
      if (!groupsOf) continue;
      const groups = Object.entries(groupsOf)
        .map(([key, tiles]) => ({
          key,
          total: tiles.reduce((s, t) => s + t.node.amount, 0),
          tiles: tiles.sort((a, b) => b.node.amount - a.node.amount),
        }))
        .sort((a, b) => b.total - a.total);
      const total = groups.reduce((s, g) => s + g.total, 0);
      if (total <= 0) continue;
      const missionNode = filteredData.nodes.find(
        (n) => n.kind === "mission" && n.code === bandKey,
      );
      built.push({
        key: bandKey,
        caption: "",
        name:
          lens === "mission"
            ? bandKey
            : (costClassStyles[bandKey]?.label ?? bandKey),
        total,
        variance:
          lens === "mission" && missionNode
            ? percentChange(missionNode.amount, previousAmounts[missionNode.id])
            : null,
        groups,
        colors:
          lens === "mission"
            ? BAND_PALETTE[index % BAND_PALETTE.length]
            : (COST_CLASS_BAND_COLORS[bandKey] ??
              BAND_PALETTE[index % BAND_PALETTE.length]),
      });
    }

    return { bands: built, drawnTotal: built.reduce((s, b) => s + b.total, 0) };
  }, [
    filteredData,
    isPko,
    lens,
    searchQuery,
    childrenOf,
    previousAmounts,
    entityPlacements,
  ]);

  // Band heights, in percent of the canvas. The gaps come out of the height
  // before it is shared out, or the bands would add up to more than the canvas.
  const bandLayout = useMemo(() => {
    const total = bands.reduce((s, b) => s + b.total, 0);
    if (total <= 0) return [];
    const gapPercent = (BAND_GAP / canvasHeight) * 100;
    const drawable = 100 - gapPercent * Math.max(0, bands.length - 1);
    let currentY = 0;
    return bands.map((band, i) => {
      const height = (band.total / total) * drawable;
      const startY = currentY;
      currentY += height + (i < bands.length - 1 ? gapPercent : 0);
      return { band, startY, height };
    });
  }, [bands, canvasHeight]);

  const labelPositions = useMemo(
    () => layoutBandLabels(bandLayout, canvasHeight),
    [bandLayout, canvasHeight],
  );

  const openSidebar = useCallback(
    (id: string) => {
      setSelectedId(id);
      replaceToSidebar(hashPrefix, id);
    },
    [hashPrefix],
  );

  const handleTileClick = (tile: Tile) => {
    if (isMobile) {
      // Touch has no hover: the first tap shows the figures, the sheet opens the
      // sidebar.
      setTooltip(
        tooltip?.tile.node.id === tile.node.id
          ? null
          : { x: window.innerWidth / 2, y: window.innerHeight / 2, tile },
      );
      setHovered(tile.node.id);
      return;
    }
    openSidebar(tile.node.id);
  };

  const meta = filteredData?.meta;
  const selected = selectedId ? byId[selectedId] : null;
  const hasCostClassDetail =
    filteredData?.nodes.some((node) => node.kind === "item") ?? !isAudited;
  const hasSplitEntities = Object.values(entityPlacements).some(
    (placements) => placements.size > 1,
  );
  const fundingLabel = (key: string) =>
    meta?.fundingLabels?.[key] ??
    FUNDING_SOURCES[key as BudgetFundingSource]?.label ??
    key;

  const controls = (
    <div className="mb-3 flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <ChartSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={
          isPko
            ? "Search missions and cost items..."
            : "Search sections and entities..."
        }
      />
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500">
          Expenditure {meta?.fiscalYear ?? (yearLabel ? yearLabel(year) : year)}{" "}
          · USD
        </span>
        {/* One year is not a range: a slider that cannot be moved only invites
            the reader to look for years that are not there. */}
        {range.years.length > 1 && (
          <YearSlider
            years={range.years}
            selectedYear={year}
            onChange={setYear}
            formatLabel={yearLabel}
          />
        )}
        {isPko && hasCostClassDetail && (
          <div className="flex h-9 items-center gap-2">
            <span
              className={`text-sm ${lens === "costClass" ? "font-medium text-gray-900" : "text-gray-500"}`}
            >
              By Cost Class
            </span>
            <Switch
              checked={lens === "mission"}
              onCheckedChange={(checked) =>
                setLens(checked ? "mission" : "costClass")
              }
              aria-label="Toggle between cost class and mission grouping"
            />
            <span
              className={`text-sm ${lens === "mission" ? "font-medium text-gray-900" : "text-gray-500"}`}
            >
              By Mission
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted || (loading && !data)) {
    return (
      <div className="w-full">
        {controls}
        <div className="flex h-[1200px] w-full items-center justify-center bg-gray-50">
          <p className="text-lg text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!data || !meta) {
    return <p className="text-sm text-gray-500">No budget data available.</p>;
  }

  if (bands.length === 0) {
    return (
      <div className="w-full">
        {controls}
        <div className="flex h-64 w-full items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">
            {activeFundingSources.length === 0
              ? "Select at least one funding source."
              : searchQuery.trim()
                ? `Nothing matches “${searchQuery}”.`
                : "No expenditure is available for the selected funding sources."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {controls}

      {meta.partial && (
        <p className="mb-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {meta.scopeLabel}. This year does not publish every funding source, so
          it is not directly comparable with years that do.
        </p>
      )}

      {hasSplitEntities && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
          <SplitSquareHorizontal className="h-3 w-3" />
          <span>Entity appears in multiple budget locations</span>
        </div>
      )}

      <div className="flex flex-col gap-2 lg:flex-row">
        {/* Narrow screens have no room for the name column, so the bands are
            listed above the chart, with a button that makes them tappable. */}
        <div className="block space-y-2 rounded bg-gray-50 px-2 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-700">
              {isPko
                ? hasCostClassDetail && lens === "costClass"
                  ? "Cost classes"
                  : "Missions"
                : "Budget parts"}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-md bg-un-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-un-blue/90"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {bands.map((band) => (
              <div
                key={`mobile-${band.key}`}
                className="flex items-center gap-1.5"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded"
                  style={{ backgroundColor: band.colors.bg }}
                />
                <span className="text-xs" style={{ color: band.colors.bg }}>
                  {band.caption ? `${band.caption}. ` : ""}
                  {band.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative w-full overflow-hidden lg:flex-1"
          style={{ height: `${canvasHeight}px` }}
        >
          {bandLayout.map(({ band, startY, height }) => {
            const bandHeightPx = (height / 100) * canvasHeight;
            const groupRects = squarifyDense<Group>(
              band.groups.map((g) => ({ value: g.total, data: g })),
              0,
              0,
              100,
              100,
              isMobile,
            );

            return (
              <div
                key={band.key}
                className="absolute right-0 left-0"
                style={{ top: `${startY}%`, height: `${height}%` }}
              >
                {groupRects.map((groupRect) => {
                  const group = groupRect.data;
                  const items: TreemapItem<Tile>[] = group.tiles.map((t) => ({
                    value: t.node.amount,
                    data: t,
                  }));
                  const tileRects = squarifyDense<Tile>(
                    items,
                    0,
                    0,
                    100,
                    100,
                    isMobile,
                  );
                  const groupHeightPx = (groupRect.height / 100) * bandHeightPx;

                  return (
                    <div
                      key={`${band.key}-${group.key}`}
                      className="absolute"
                      style={{
                        left: `${groupRect.x}%`,
                        top: `${groupRect.y}%`,
                        width: `${groupRect.width}%`,
                        height: `${groupRect.height}%`,
                      }}
                    >
                      {tileRects.map((rect) => {
                        const tile = rect.data;
                        const isHovered = hovered === tile.node.id;
                        const tileHeightPx =
                          (rect.height / 100) * groupHeightPx;
                        const showName = tileHeightPx > 13 && rect.width > 2;
                        const showAmount = tileHeightPx > 30 && rect.width > 4;
                        const caption = tile.caption;
                        const fundingValues = positiveFundingValues(tile.node);
                        const fundingTotal = fundingValues.reduce(
                          (sum, [, amount]) => sum + amount,
                          0,
                        );
                        return (
                          <div
                            key={tile.node.id}
                            data-node={tile.node.id}
                            className="absolute cursor-pointer overflow-hidden transition-[filter] duration-150"
                            style={{
                              left: `${rect.x}%`,
                              top: `${rect.y}%`,
                              width: `${rect.width}%`,
                              height: `${rect.height}%`,
                              backgroundColor:
                                fundingTotal > 0 ? "#ffffff" : band.colors.bg,
                              filter: isHovered
                                ? "brightness(0.82)"
                                : undefined,
                            }}
                            onClick={() => handleTileClick(tile)}
                            onMouseEnter={() =>
                              !isMobile && setHovered(tile.node.id)
                            }
                            onMouseMove={(e) =>
                              !isMobile &&
                              setTooltip({ x: e.clientX, y: e.clientY, tile })
                            }
                            onMouseLeave={() => {
                              if (isMobile) return;
                              setHovered(null);
                              setTooltip(null);
                            }}
                          >
                            {fundingTotal > 0 && (
                              <div className="absolute inset-0 flex flex-col">
                                {fundingValues.map(([key, amount]) => (
                                  <div
                                    key={key}
                                    style={{
                                      height: `${(amount / fundingTotal) * 100}%`,
                                      backgroundColor: band.colors.bg,
                                      opacity:
                                        FUNDING_SHADE_OPACITY[key] ?? 0.35,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                            {tile.node.isRemainder && (
                              <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                  backgroundImage:
                                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 4px, transparent 4px 8px)",
                                }}
                              />
                            )}
                            <div className="relative flex h-full w-full flex-col items-start overflow-hidden px-0.5">
                              {showName && (
                                <div className="flex w-full items-center gap-1 text-left text-xs leading-tight font-semibold text-white">
                                  <span className="truncate">{caption}</span>
                                  {tile.appearsInMultipleLocations && (
                                    <SplitSquareHorizontal
                                      className="h-3 w-3 shrink-0 opacity-80"
                                      aria-label="Appears in multiple budget locations"
                                    />
                                  )}
                                </div>
                              )}
                              {showAmount && (
                                <div className="-mt-0.5 w-full truncate text-left text-[10px] leading-tight text-white/95">
                                  {formatBudget(tile.node.amount)}{" "}
                                  {formatVariance(tile.variance)}
                                </div>
                              )}
                            </div>
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0"
                              style={{
                                boxShadow:
                                  "inset 0 0 0 0.5px rgba(255, 255, 255, 0.6)",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* The band names, beside their band */}
        <div
          className="relative hidden w-60 shrink-0 lg:block"
          style={{ height: `${canvasHeight}px` }}
        >
          {labelPositions.map(({ band, y, compact }) => (
            <div
              key={`label-${band.key}`}
              className={`absolute left-0 flex -translate-y-px text-xs leading-none ${compact ? "whitespace-nowrap" : ""}`}
              style={{ top: `${y}px`, color: band.colors.bg }}
            >
              {band.caption && (
                <span className="w-6 font-medium">{band.caption}.</span>
              )}
              {compact ? (
                <>
                  <span className="font-medium">{band.name}</span>
                  <span className="ml-3">
                    {formatBudget(band.total)} {formatVariance(band.variance)}
                  </span>
                </>
              ) : (
                <div className="leading-tight">
                  <div className="font-medium">{band.name}</div>
                  <div className="mt-0.5">
                    {formatBudget(band.total)} {formatVariance(band.variance)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total, scope caveat and source */}
      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>
          {meta.title} · {meta.scopeLabel}: {formatBudget(drawnTotal)}
          {searchQuery.trim() === "" &&
            Math.abs(drawnTotal - meta.total) > 1000 && (
              <> of {formatBudget(meta.total)} in the published total</>
            )}
          {filteredPrevious && " · the change is against the year before"}
        </p>
        <p>{meta.scopeWarning}</p>
        {(meta.omitted ?? []).length > 0 && (
          <p>
            Not drawn, because the budget prints no total for them:{" "}
            {(meta.omitted ?? [])
              .map(
                (o) =>
                  o.label +
                  (Object.keys(o.values).length
                    ? ` (only ${Object.entries(o.values)
                        .map(
                          ([key, amount]) =>
                            `${FUNDING_SOURCES[key]?.label ?? key} ${formatBudget(amount)}`,
                        )
                        .join(", ")})`
                    : ""),
              )
              .join("; ")}
            .
          </p>
        )}
        <p>
          Source:{" "}
          {meta.documentUrl && meta.documentSymbol ? (
            <a
              href={meta.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-un-blue hover:underline"
            >
              {meta.documentSymbol}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            "budget fascicles"
          )}
          {" · extracted by "}
          <a
            href={meta.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-un-blue hover:underline"
          >
            {meta.source.repo} {meta.source.release}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      {/* Tooltip: a sheet at the foot of a narrow screen, otherwise at the cursor */}
      {tooltip && isMobile && (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-lg border border-gray-200 bg-white p-4 shadow-2xl">
          <button
            onClick={() => {
              setTooltip(null);
              setHovered(null);
            }}
            className="absolute top-2 right-2 rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="pr-8">
            <p className="text-sm leading-tight font-medium text-gray-900">
              {tooltip.tile.node.entity?.name ?? tooltip.tile.caption}
            </p>
            {tooltip.tile.node.parentId && byId[tooltip.tile.node.parentId] && (
              <p className="mt-1 text-xs text-gray-500">
                {byId[tooltip.tile.node.parentId].label}
              </p>
            )}
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatBudget(tooltip.tile.node.amount)}{" "}
              {formatVariance(tooltip.tile.variance)}
            </p>
            {positiveFundingValues(tooltip.tile.node).map(([key, amount]) => (
              <p key={key} className="mt-0.5 text-xs text-gray-500">
                {fundingLabel(key)} {formatBudget(amount)}
              </p>
            ))}
            {tooltip.tile.appearsInMultipleLocations && (
              <p className="mt-1 text-xs text-gray-500">
                This entity also appears elsewhere in the budget hierarchy.
              </p>
            )}
            {unitExplanation(tooltip.tile.node) && (
              <p className="mt-1 text-xs text-gray-500">
                {unitExplanation(tooltip.tile.node)}
              </p>
            )}
            <button
              onClick={() => openSidebar(tooltip.tile.node.id)}
              className="mt-3 w-full rounded bg-un-blue px-4 py-2 text-sm font-medium text-white hover:bg-un-blue/90"
            >
              View details
            </button>
          </div>
        </div>
      )}

      {tooltip && !isMobile && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 320),
            top: Math.min(tooltip.y + 12, window.innerHeight - 200),
          }}
        >
          <p className="text-sm leading-tight font-medium text-gray-900">
            {tooltip.tile.node.entity?.name ?? tooltip.tile.caption}
          </p>
          {tooltip.tile.node.parentId && byId[tooltip.tile.node.parentId] && (
            <p className="mt-1 text-xs text-gray-500">
              {byId[tooltip.tile.node.parentId].label}
            </p>
          )}
          {isPko && tooltip.tile.node.costClass && (
            <p className="text-xs text-gray-500">
              {COST_CLASS_SHORT[tooltip.tile.node.costClass] ??
                tooltip.tile.node.costClass}
            </p>
          )}
          <p className="mt-1 text-xs font-medium text-gray-700">
            {formatBudget(tooltip.tile.node.amount)}{" "}
            {formatVariance(tooltip.tile.variance)}
          </p>
          {positiveFundingValues(tooltip.tile.node).map(([key, amount]) => (
            <p key={key} className="mt-0.5 text-xs text-gray-500">
              {fundingLabel(key)} {formatBudget(amount)}
            </p>
          ))}
          {tooltip.tile.appearsInMultipleLocations && (
            <p className="mt-1 text-xs text-gray-500">
              This entity also appears elsewhere in the budget hierarchy.
            </p>
          )}
          {unitExplanation(tooltip.tile.node) && (
            <p className="mt-1 text-xs text-gray-500">
              {unitExplanation(tooltip.tile.node)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Click for details</p>
        </div>
      )}

      {selected && (
        <BudgetSidebar
          node={selected}
          parent={selected.parentId ? byId[selected.parentId] : null}
          childrenByParent={childrenOf}
          meta={meta}
          hashPrefix={hashPrefix}
          onClose={() => {
            setSelectedId(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
