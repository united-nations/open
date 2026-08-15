"use client";

// Budget-document treemap for /secretariat, in the layout of ../budget-explorer:
// the groups are stacked as bands whose height is their share of the budget, the
// level below is squarified inside its band, and the tiles are the lowest rows
// the documents print. The band names sit in a column beside the chart rather
// than in a legend below it.
//
//   budget-ppb   part band -> section -> entity, component, subprogramme or
//                allocation (whatever the fascicle itemizes below the section)
//   budget-pko   mission band -> cost class -> cost item, or the same the other
//                way round when the lens is switched
//
// Data: public/data/budget-{ppb,pko}-{year}.json, written by python/12 from the
// financial-data-v1.4 release of united-nations/programme-budget-data.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { BudgetData, BudgetNode } from "@/types";
import { useDeepLink, replaceToSidebar, clearSidebarHash } from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import { BudgetSidebar } from "@/components/BudgetSidebar";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { Switch } from "@/components/ui/switch";
import { YearSlider } from "@/components/YearSlider";
import { useYearRanges } from "@/lib/useYearRanges";
import { squarifyDense, type TreemapItem } from "@/lib/treemapLayout";
import {
  COST_CLASS_BAND_COLORS,
  COST_CLASS_SHORT,
  costClassStyles,
  fiscalYearLabel,
  FUNDING_SOURCES,
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

interface Tile {
  node: BudgetNode;
  caption: string;
  variance: number | null;
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

/** "↗3.2%", with a variation selector so iOS draws an arrow, not an emoji. */
function formatVariance(value: number | null): string {
  if (value === null) return "";
  const arrow = value > 0 ? "↗︎" : value < 0 ? "↘︎" : "→︎";
  return `${arrow}${Math.abs(value).toFixed(1)}%`;
}

function percentChange(current: number, before: number | undefined): number | null {
  if (before === undefined || before <= 0) return null;
  return ((current - before) / before) * 100;
}

interface BudgetTreemapProps {
  /** Dataset in public/data: one file per year, `{dataset}-{year}.json`. */
  dataset: "budget-ppb" | "budget-pko";
  /** Hash prefix for deep links, e.g. "secretariat" or "pko". */
  hashPrefix: string;
  /** Section to scroll to when a deep link opens. */
  sectionId: string;
}

export function BudgetTreemap({ dataset, hashPrefix, sectionId }: BudgetTreemapProps) {
  const yearRanges = useYearRanges();
  const isPko = dataset === "budget-pko";
  const range = isPko ? yearRanges.budgetPko : yearRanges.budgetPpb;

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
  const [tooltip, setTooltip] = useState<{ x: number; y: number; tile: Tile } | null>(null);

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
      .catch((err) => console.error(`Failed to load ${dataset}-${year}.json:`, err))
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
      setCanvasHeight(width < 640 ? (isExpanded ? 6000 : 2000) : width < 1024 ? 1600 : 1200);
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [isExpanded]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const byId = useMemo(() => {
    const map: Record<string, BudgetNode> = {};
    for (const n of data?.nodes ?? []) map[n.id] = n;
    return map;
  }, [data]);

  const childrenOf = useMemo(() => {
    const map: Record<string, BudgetNode[]> = {};
    for (const n of data?.nodes ?? []) {
      if (n.parentId) (map[n.parentId] ??= []).push(n);
    }
    for (const list of Object.values(map)) list.sort((a, b) => b.amount - a.amount);
    return map;
  }, [data]);

  const previousAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of previous?.nodes ?? []) map[n.id] = n.amount;
    return map;
  }, [previous]);

  // Resolve a pending deep link once the data is there.
  useEffect(() => {
    if (pendingDeepLink && byId[pendingDeepLink]) {
      setSelectedId(pendingDeepLink);
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, byId, setPendingDeepLink]);

  // A section, mission or component that the chosen year does not print has no
  // node: close the sidebar rather than leave the year before on screen.
  useEffect(() => {
    if (selectedId && data && !byId[selectedId]) {
      setSelectedId(null);
      clearSidebarHash();
    }
  }, [selectedId, data, byId]);

  const { bands, drawnTotal } = useMemo(() => {
    const empty = { bands: [] as Band[], drawnTotal: 0 };
    if (!data) return empty;

    const query = searchQuery.trim().toLowerCase();
    const keep = (node: BudgetNode, extra = "") =>
      !query ||
      `${node.label} ${node.code ?? ""} ${extra}`.toLowerCase().includes(query);

    const tileOf = (node: BudgetNode, caption: string): Tile => ({
      node,
      caption,
      variance: percentChange(node.amount, previousAmounts[node.id]),
    });

    const built: Band[] = [];

    if (!isPko) {
      // Part -> section -> whatever the fascicle itemizes below the section.
      const parts = data.nodes
        .filter((n) => n.kind === "part")
        .sort(
          (a, b) =>
            (budgetPartStyles[a.code ?? ""]?.order ?? 999) -
            (budgetPartStyles[b.code ?? ""]?.order ?? 999)
        );
      for (const [index, part] of parts.entries()) {
        const groups: Group[] = [];
        for (const section of childrenOf[part.id] ?? []) {
          const below = childrenOf[section.id] ?? [];
          // A section the fascicle does not break down is its own tile.
          const rows = below.length > 0 ? below : [section];
          const tiles = rows
            .filter((n) => n.amount > 0 && keep(n, section.label))
            .map((n) =>
              tileOf(n, n === section ? `${section.code}. ${section.label}` : n.label)
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
          colors: PART_BAND_COLORS[code] ?? BAND_PALETTE[index % BAND_PALETTE.length],
        });
      }
      return { bands: built, drawnTotal: built.reduce((s, b) => s + b.total, 0) };
    }

    // Peacekeeping: the tiles are the cost items, banded by mission or by cost
    // class, and grouped by the other one.
    const items = data.nodes.filter((n) => n.kind === "item" && n.amount > 0);
    const missionTotals: Record<string, number> = {};
    for (const n of data.nodes) {
      if (n.kind === "mission") missionTotals[n.code ?? n.id] = n.amount;
    }
    const missionOrder = Object.keys(missionTotals).sort(
      (a, b) => missionTotals[b] - missionTotals[a]
    );

    const nest: Record<string, Record<string, Tile[]>> = {};
    for (const item of items) {
      if (!keep(item, `${item.mission ?? ""} ${item.costClass ?? ""}`)) continue;
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
      const missionNode = data.nodes.find(
        (n) => n.kind === "mission" && n.code === bandKey
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
            : (COST_CLASS_BAND_COLORS[bandKey] ?? BAND_PALETTE[index % BAND_PALETTE.length]),
      });
    }

    return { bands: built, drawnTotal: built.reduce((s, b) => s + b.total, 0) };
  }, [data, isPko, lens, searchQuery, childrenOf, previousAmounts]);

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

  // Band names sit at the top of their band; push one down only when the name
  // above it would otherwise overlap.
  const labelPositions = useMemo(() => {
    const positions = bandLayout.map(({ band, startY }) => ({ key: band.key, y: startY }));
    for (let i = 1; i < positions.length; i++) {
      const above = positions[i - 1];
      if (positions[i].y < above.y + 1.2) positions[i].y = above.y + 1.25;
    }
    return positions;
  }, [bandLayout]);

  const openSidebar = useCallback(
    (id: string) => {
      setSelectedId(id);
      replaceToSidebar(hashPrefix, id);
    },
    [hashPrefix]
  );

  const handleTileClick = (tile: Tile) => {
    if (isMobile) {
      // Touch has no hover: the first tap shows the figures, the sheet opens the
      // sidebar.
      setTooltip(
        tooltip?.tile.node.id === tile.node.id
          ? null
          : { x: window.innerWidth / 2, y: window.innerHeight / 2, tile }
      );
      setHovered(tile.node.id);
      return;
    }
    openSidebar(tile.node.id);
  };

  const meta = data?.meta;
  const selected = selectedId ? byId[selectedId] : null;

  const controls = (
    <div className="mb-3 flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <ChartSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={isPko ? "Search missions and cost items..." : "Search sections and entities..."}
      />
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500">
          Expenditure {isPko ? fiscalYearLabel(year) : year} · USD
        </span>
        <YearSlider
          years={range.years}
          selectedYear={year}
          onChange={setYear}
          formatLabel={isPko ? fiscalYearLabel : undefined}
        />
        {isPko && (
          <div className="flex h-9 items-center gap-2">
            <span
              className={`text-sm ${lens === "costClass" ? "font-medium text-gray-900" : "text-gray-500"}`}
            >
              By Cost Class
            </span>
            <Switch
              checked={lens === "mission"}
              onCheckedChange={(checked) => setLens(checked ? "mission" : "costClass")}
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
          <p className="text-sm text-gray-500">Nothing matches “{searchQuery}”.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {controls}

      {meta.partial && (
        <p className="mb-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {meta.scopeLabel}. This year is not comparable with the others: the total
          below is {formatBudget(meta.total)}, against about $12 billion in the years
          that publish all three funding sources.
        </p>
      )}

      <div className="flex flex-col gap-2 lg:flex-row">
        {/* Narrow screens have no room for the name column, so the bands are
            listed above the chart, with a button that makes them tappable. */}
        <div className="block space-y-2 rounded bg-gray-50 px-2 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-700">
              {isPko ? (lens === "mission" ? "Missions" : "Cost classes") : "Budget parts"}
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
              <div key={`mobile-${band.key}`} className="flex items-center gap-1.5">
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
              isMobile
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
                  const tileRects = squarifyDense<Tile>(items, 0, 0, 100, 100, isMobile);
                  const needsDividers = groupRects.length > 1 || tileRects.length > 1;
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
                        const tileHeightPx = (rect.height / 100) * groupHeightPx;
                        const showName = tileHeightPx > 13 && rect.width > 2;
                        const showAmount = tileHeightPx > 30 && rect.width > 4;
                        const caption = isPko
                          ? tile.caption
                          : (tile.node.code ? `${tile.node.code}. ` : "") + tile.node.label;
                        return (
                          <div
                            key={tile.node.id}
                            data-node={tile.node.id}
                            className="absolute cursor-pointer transition-colors duration-150"
                            style={{
                              left: `${rect.x}%`,
                              top: `${rect.y}%`,
                              width: `${rect.width}%`,
                              height: `${rect.height}%`,
                              backgroundColor: isHovered
                                ? band.colors.hover
                                : band.colors.bg,
                              boxShadow: needsDividers
                                ? "inset 0 0 0 0.5px rgba(255, 255, 255, 0.6)"
                                : "none",
                              // A row printed as a lump, with nothing said about
                              // what is inside it, is drawn but hatched.
                              backgroundImage: tile.node.isRemainder
                                ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 4px, transparent 4px 8px)"
                                : undefined,
                            }}
                            onClick={() => handleTileClick(tile)}
                            onMouseEnter={() => !isMobile && setHovered(tile.node.id)}
                            onMouseMove={(e) =>
                              !isMobile && setTooltip({ x: e.clientX, y: e.clientY, tile })
                            }
                            onMouseLeave={() => {
                              if (isMobile) return;
                              setHovered(null);
                              setTooltip(null);
                            }}
                          >
                            <div className="flex h-full w-full flex-col items-start overflow-hidden px-0.5">
                              {showName && (
                                <div className="w-full truncate text-left text-xs leading-tight font-semibold text-white">
                                  {caption}
                                </div>
                              )}
                              {showAmount && (
                                <div className="-mt-0.5 w-full truncate text-left text-[10px] leading-tight text-white/95">
                                  {formatBudget(tile.node.amount)} {formatVariance(tile.variance)}
                                </div>
                              )}
                            </div>
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
          {labelPositions.map((position) => {
            const entry = bandLayout.find((b) => b.band.key === position.key);
            if (!entry) return null;
            const { band } = entry;
            return (
              <div
                key={`label-${band.key}`}
                className="absolute left-0 flex -translate-y-px text-xs leading-none"
                style={{ top: `${position.y}%`, color: band.colors.bg }}
              >
                {band.caption && <span className="w-6 font-medium">{band.caption}.</span>}
                <div className="leading-tight">
                  <div className="font-medium">{band.name}</div>
                  <div className="mt-0.5">
                    {formatBudget(band.total)} {formatVariance(band.variance)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total, scope caveat and source */}
      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>
          {meta.title} · {meta.scopeLabel}: {formatBudget(drawnTotal)}
          {searchQuery.trim() === "" && Math.abs(drawnTotal - meta.total) > 1000 && (
            <> of {formatBudget(meta.total)} in the published total</>
          )}
          {previous && " · the change is against the year before"}
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
                            `${FUNDING_SOURCES[key]?.label ?? key} ${formatBudget(amount)}`
                        )
                        .join(", ")})`
                    : "")
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
              {tooltip.tile.node.label}
            </p>
            {tooltip.tile.node.parentId && byId[tooltip.tile.node.parentId] && (
              <p className="mt-1 text-xs text-gray-500">
                {byId[tooltip.tile.node.parentId].label}
              </p>
            )}
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatBudget(tooltip.tile.node.amount)} {formatVariance(tooltip.tile.variance)}
            </p>
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
            {tooltip.tile.node.label}
          </p>
          {tooltip.tile.node.parentId && byId[tooltip.tile.node.parentId] && (
            <p className="mt-1 text-xs text-gray-500">
              {byId[tooltip.tile.node.parentId].label}
            </p>
          )}
          {isPko && tooltip.tile.node.costClass && (
            <p className="text-xs text-gray-500">
              {COST_CLASS_SHORT[tooltip.tile.node.costClass] ?? tooltip.tile.node.costClass}
            </p>
          )}
          <p className="mt-1 text-xs font-medium text-gray-700">
            {formatBudget(tooltip.tile.node.amount)} {formatVariance(tooltip.tile.variance)}
          </p>
          {tooltip.tile.node.isRemainder && (
            <p className="mt-1 text-xs text-gray-500">
              The document prints this as a lump, without saying what is inside it.
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Click for details</p>
        </div>
      )}

      {selected && (
        <BudgetSidebar
          node={selected}
          parent={selected.parentId ? byId[selected.parentId] : null}
          childNodes={childrenOf[selected.id] ?? []}
          meta={meta}
          hashPrefix={hashPrefix}
          onSelect={openSidebar}
          onClose={() => {
            setSelectedId(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
