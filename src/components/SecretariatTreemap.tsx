"use client";

import { useEffect, useMemo, useState } from "react";
import { SplitSquareHorizontal } from "lucide-react";
import { Entity, SecretariatData, SecretariatRecord } from "@/types";
import { useDeepLink, replaceToSidebar, clearSidebarHash } from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import { loadStaticData } from "@/lib/data";
import { YearSlider } from "@/components/YearSlider";
import { SecretariatSidebar } from "@/components/SecretariatSidebar";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClickHint } from "@/components/ui/ClickHint";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { squarify, layoutGroups, type TreemapItem } from "@/lib/treemapLayout";
import {
  GroupingLens,
  getGroupingStyles,
  getGroupStyle,
} from "@/lib/secretariatGroupings";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// A drawable tile: one (entity, group) record with net amount > 0.
interface Tile {
  entity: string;
  groupKey: string;
  amount: number;
  isPartial: boolean; // entity spans >1 group in the active lens
  entityTotal: number; // entity's net total across all groups (this year)
}

function groupKeyOf(lens: GroupingLens, r: SecretariatRecord): string {
  return lens === "priorityArea" ? r.priority_area : r.part_id;
}

export function SecretariatTreemap() {
  const yearRanges = useYearRanges();
  const YEARS = generateYearRange(
    yearRanges.secretariat.min,
    yearRanges.secretariat.max
  );

  const [data, setData] = useState<SecretariatData | null>(null);
  // Display metadata (long names, descriptions, links) joined by entity code
  // from the shared entities.json — available for ~99 of 153 sub-entities.
  const [entityMeta, setEntityMeta] = useState<Record<string, Entity>>({});
  const [year, setYear] = useState<number>(yearRanges.secretariat.default);
  const [lens, setLens] = useState<GroupingLens>("priorityArea");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "secretariat",
    sectionId: "secretariat",
    onNavigateAway: () => setSelectedEntity(null),
  });

  useEffect(() => {
    setLoading(true);
    fetch(`${basePath}/data/secretariat-${year}.json`)
      .then((res) => res.json())
      .then((d: SecretariatData) => setData(d))
      .catch((err) => console.error("Failed to load secretariat data:", err))
      .finally(() => setLoading(false));
  }, [year]);

  // Load entity display metadata once.
  useEffect(() => {
    loadStaticData<Entity[]>("entities.json")
      .then((list) => {
        const map: Record<string, Entity> = {};
        for (const e of list) if (e.entity) map[e.entity] = e;
        setEntityMeta(map);
      })
      .catch((err) => console.error("Failed to load entities.json:", err));
  }, []);

  // Resolve a pending deep link once data is available.
  useEffect(() => {
    if (pendingDeepLink && data && data.funds[pendingDeepLink]) {
      setSelectedEntity(pendingDeepLink);
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, data, setPendingDeepLink]);

  const { groups, pageTotal, hiddenCount, hiddenTotal } = useMemo(() => {
    if (!data) {
      return { groups: [], pageTotal: 0, hiddenCount: 0, hiddenTotal: 0 };
    }
    // Entity net total this year (across all groups), and groups-per-entity.
    const entityTotal: Record<string, number> = {};
    const entityGroups: Record<string, Set<string>> = {};
    for (const r of data.records) {
      entityTotal[r.entity] = (entityTotal[r.entity] ?? 0) + r.amount;
      (entityGroups[r.entity] ??= new Set()).add(groupKeyOf(lens, r));
    }

    // Aggregate records to (group, entity) net amounts (records may already be
    // unique per (entity, area, part); summing collapses the other dimension).
    // Search filters by entity code (case-insensitive substring).
    const q = searchQuery.trim().toLowerCase();
    const byGroup: Record<string, Record<string, number>> = {};
    let pageTotal = 0;
    for (const r of data.records) {
      if (q && !r.entity.toLowerCase().includes(q)) continue;
      const g = groupKeyOf(lens, r);
      (byGroup[g] ??= {})[r.entity] = (byGroup[g][r.entity] ?? 0) + r.amount;
      pageTotal += r.amount;
    }

    let hiddenCount = 0;
    let hiddenTotal = 0;
    const groups = Object.entries(byGroup).map(([groupKey, entities]) => {
      const netTotal = Object.values(entities).reduce((s, v) => s + v, 0);
      const tiles: Tile[] = [];
      for (const [entity, amount] of Object.entries(entities)) {
        if (amount > 0) {
          tiles.push({
            entity,
            groupKey,
            amount,
            isPartial: (entityGroups[entity]?.size ?? 1) > 1,
            entityTotal: entityTotal[entity] ?? amount,
          });
        } else {
          hiddenCount += 1;
          hiddenTotal += amount;
        }
      }
      tiles.sort((a, b) => b.amount - a.amount);
      const drawTotal = tiles.reduce((s, t) => s + t.amount, 0);
      return { groupKey, netTotal, drawTotal, tiles };
    });

    // Order groups by configured order, then by drawable size.
    const styles = getGroupingStyles(lens);
    groups.sort((a, b) => {
      const oa = styles[a.groupKey]?.order ?? 999;
      const ob = styles[b.groupKey]?.order ?? 999;
      return oa - ob || b.drawTotal - a.drawTotal;
    });

    return { groups, pageTotal, hiddenCount, hiddenTotal };
  }, [data, lens, searchQuery]);

  // Build absolutely-positioned tiles: lay out the groups (big groups as
  // full-width rows, small ones bundled into a nested corner block), then
  // squarify each group's entities inside its rectangle.
  const positioned: Array<{ tile: Tile; x: number; y: number; w: number; h: number; groupKey: string }> = [];
  const tilesByGroup = Object.fromEntries(groups.map((g) => [g.groupKey, g.tiles]));
  const groupRects = layoutGroups(
    groups
      .filter((g) => g.drawTotal > 0)
      .map((g) => ({ key: g.groupKey, total: g.drawTotal }))
  );
  for (const gr of groupRects) {
    const items: TreemapItem<Tile>[] = (tilesByGroup[gr.key] ?? []).map((t) => ({
      value: t.amount,
      data: t,
    }));
    const rects = squarify(items, gr.x, gr.y, gr.width, gr.height);
    rects.forEach((rect) =>
      positioned.push({
        tile: rect.data,
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        groupKey: gr.key,
      })
    );
  }

  const lensLabel = lens === "priorityArea" ? "Priority Area" : "Budget Part";

  const controls = (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        {/* Search Input */}
        <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:gap-3">
          <ChartSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search entities..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Year Slider */}
          <YearSlider years={YEARS} selectedYear={year} onChange={setYear} />

          {/* Budget Part / Priority Area toggle (Priority Area is the default) */}
          <div className="flex h-9 items-center gap-2">
            <span className={`text-sm ${lens === "budgetPart" ? "font-medium text-gray-900" : "text-gray-500"}`}>
              By Budget Part
            </span>
            <Switch
              checked={lens === "priorityArea"}
              onCheckedChange={(checked) => setLens(checked ? "priorityArea" : "budgetPart")}
              aria-label="Toggle between budget part and priority area grouping"
            />
            <span className={`text-sm ${lens === "priorityArea" ? "font-medium text-gray-900" : "text-gray-500"}`}>
              By Priority Area
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="w-full">
        {controls}
        <div className="flex h-[975px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {controls}

      <div className="relative h-[975px] w-full bg-gray-100">
        {positioned.map(({ tile, x, y, w, h, groupKey }, i) => {
          const styles = getGroupStyle(lens, groupKey);
          const isHovered = hovered === tile.entity;
          const showLabel = w > 4 && h > 4;
          const sharePct = tile.entityTotal > 0
            ? Math.round((tile.amount / tile.entityTotal) * 100)
            : 0;
          const longName = entityMeta[tile.entity]?.entity_long;
          return (
            <Tooltip key={`${tile.entity}-${groupKey}-${i}`} delayDuration={50} disableHoverableContent>
              <TooltipTrigger asChild>
                <div
                  data-entity={tile.entity}
                  className={`absolute cursor-pointer transition-[left,top,width,height] duration-[800ms] ease-in-out hover:ring-2 hover:ring-white/60 hover:brightness-110 ${styles.bgColor} ${styles.textColor}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${w}%`,
                    height: `${h}%`,
                    opacity: isHovered ? 1 : 0.9,
                    zIndex: isHovered ? 10 : 1,
                  }}
                  onClick={() => {
                    setSelectedEntity(tile.entity);
                    replaceToSidebar("secretariat", tile.entity);
                  }}
                  onMouseEnter={() => setHovered(tile.entity)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {showLabel && (
                    <div className="relative h-full overflow-hidden p-1">
                      <div className="flex items-center gap-1 truncate text-xs font-medium leading-tight">
                        {tile.entity}
                        {tile.isPartial && (
                          <SplitSquareHorizontal
                            className="h-3 w-3 shrink-0 opacity-70"
                            aria-label="Partial — only part of this entity"
                          />
                        )}
                      </div>
                      <div className="truncate text-xs leading-tight opacity-70">
                        {formatBudget(tile.amount)}
                      </div>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg sm:max-w-sm"
                hideWhenDetached
                avoidCollisions
                collisionPadding={12}
              >
                <div className="max-w-xs p-1 text-center sm:max-w-sm">
                  <p className="text-xs font-medium leading-tight sm:text-sm">
                    {longName ?? tile.entity}
                  </p>
                  {longName && (
                    <p className="text-xs text-slate-400">{tile.entity}</p>
                  )}
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${styles.bgColor}`} />
                    <span className="text-xs text-slate-500">{styles.label}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {formatBudget(tile.amount)}
                  </p>
                  {tile.isPartial && (
                    <p className="mt-1 text-xs text-slate-500">
                      Part of {tile.entity} — {sharePct}% of its {year} total ({formatBudget(tile.entityTotal)})
                    </p>
                  )}
                  <ClickHint />
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {groups.map((g) => {
          const styles = getGroupStyle(lens, g.groupKey);
          return (
            <div key={g.groupKey} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`inline-block h-3 w-3 rounded-sm ${styles.bgColor}`} />
              <span>{styles.label}</span>
              <span className="text-gray-400">{formatBudget(g.netTotal)}</span>
            </div>
          );
        })}
      </div>

      {/* Footnote: total + non-drawable count */}
      <p className="mt-3 text-xs text-gray-500">
        Total {year} Secretariat budget by {lensLabel}: {formatBudget(pageTotal)}.
        {hiddenCount > 0 && (
          <>
            {" "}
            {hiddenCount} entity {hiddenCount === 1 ? "segment" : "segments"} with net ≤ 0
            ({formatBudget(hiddenTotal)}) not shown as tiles but included in the total.
          </>
        )}
      </p>

      {selectedEntity && data && (
        <SecretariatSidebar
          entity={selectedEntity}
          details={entityMeta[selectedEntity]}
          funds={data.funds[selectedEntity] ?? []}
          year={year}
          onClose={() => {
            setSelectedEntity(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
