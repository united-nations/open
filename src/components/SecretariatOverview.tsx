"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { SecretariatEntitySidebar } from "@/components/SecretariatEntitySidebar";
import {
  SecretariatGroupBar,
  SecretariatStackedBar,
} from "@/components/SecretariatStackedBar";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import { FUNDING_SOURCES } from "@/lib/budgetGroupings";
import { FINANCING_INSTRUMENT_COLORS } from "@/lib/financingInstruments";
import { BAND_PALETTE, priorityAreaStyles } from "@/lib/secretariatGroupings";
import { layoutGroups, squarifyDense } from "@/lib/treemapLayout";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  SecretariatFundingSource,
  SecretariatGroup,
  SecretariatOverviewCell,
  SecretariatOverviewData,
  SecretariatOverviewEntity,
} from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type FilterDimension = "priority" | "funding" | "group";

const FUNDING_STYLES: Record<
  SecretariatFundingSource,
  { color: string; textColor: string }
> = {
  regular_budget: {
    color: FINANCING_INSTRUMENT_COLORS.assessed,
    textColor: "#ffffff",
  },
  other_assessed: {
    color: FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked,
    textColor: "#1f2937",
  },
  extrabudgetary: {
    color: FINANCING_INSTRUMENT_COLORS.voluntary_earmarked,
    textColor: "#1f2937",
  },
};

const priorityNames = Object.keys(priorityAreaStyles);
const priorityPalette = BAND_PALETTE.filter(
  ({ bg }) =>
    !Object.values(FINANCING_INSTRUMENT_COLORS).includes(bg.toLowerCase()),
);
const PRIORITY_COLOR_OVERRIDES: Record<string, string> = {
  "Drug control, crime prevention and combating terrorism": "#9a6b2f",
};
const priorityColor = (name: string) =>
  PRIORITY_COLOR_OVERRIDES[name] ??
  priorityPalette[
    Math.max(0, priorityNames.indexOf(name)) % priorityPalette.length
  ]?.bg ??
  "#6b7280";

const PEACE_AND_SECURITY_PRIORITY =
  "Maintenance of international peace and security";

function sumCells(cells: SecretariatOverviewCell[]) {
  return cells.reduce((sum, cell) => sum + cell.amount, 0);
}

interface OverviewTile {
  id: string;
  entity: SecretariatOverviewEntity;
  placement: string;
  value: number;
  selectedAmount: number | null;
}

export function SecretariatOverview() {
  const years = useYearRanges().secretariatOverview;
  const [year, setYear] = useState(years.default);
  const [data, setData] = useState<SecretariatOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<string | null>(null);
  const [funding, setFunding] = useState<SecretariatFundingSource | null>(null);
  const [group, setGroup] = useState<SecretariatGroup | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "secretariat-entity",
    sectionId: "priorities",
    onNavigateAway: () => setSelectedCode(null),
  });

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetch(`${basePath}/data/secretariat-overview-${year}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${year} data`);
        return response.json() as Promise<SecretariatOverviewData>;
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setError(
          reason instanceof Error ? reason.message : "Failed to load data",
        );
      });
    return () => controller.abort();
  }, [year]);

  const current = data?.meta.year === year ? data : null;
  const selectedEntity = current?.entities.find(
    (entity) => entity.code === selectedCode,
  );

  useEffect(() => {
    if (!pending || !current) return;
    const match = current.entities.find((entity) => entity.code === pending);
    if (match) setSelectedCode(match.code);
    setPending(null);
  }, [current, pending, setPending]);

  const cellsFor = (
    entity: SecretariatOverviewEntity,
    skip?: FilterDimension,
  ) =>
    entity.cells.filter(
      (cell) =>
        (skip === "priority" || !priority || cell.priority_area === priority) &&
        (skip === "funding" || !funding || cell.funding_source === funding) &&
        (skip === "group" || !group || entity.group === group),
    );

  const barSegments = useMemo(() => {
    if (!current)
      return {
        priority: [],
        funding: [],
        groupAmounts: {
          secretariat: 0,
          spm: 0,
          pko: 0,
          other: 0,
        },
      };
    const amount = (dimension: FilterDimension, key: string): number =>
      current.entities.reduce((total, entity) => {
        if (dimension === "group" && entity.group !== key) return total;
        return (
          total +
          sumCells(
            cellsFor(entity, dimension).filter((cell) => {
              if (dimension === "priority") return cell.priority_area === key;
              if (dimension === "funding") return cell.funding_source === key;
              return true;
            }),
          )
        );
      }, 0);

    return {
      priority: current.meta.priorities
        .map((name) => ({
          key: name,
          label: name,
          amount: amount("priority", name),
          color: priorityColor(name),
        }))
        .sort((a, b) => b.amount - a.amount),
      funding: current.meta.funding_sources.map((source) => ({
        key: source,
        label: FUNDING_SOURCES[source].label,
        amount: amount("funding", source),
        color: FUNDING_STYLES[source].color,
        textColor: FUNDING_STYLES[source].textColor,
      })),
      groupAmounts: Object.fromEntries(
        (Object.keys(current.meta.groups) as SecretariatGroup[]).map((key) => [
          key,
          amount("group", key),
        ]),
      ) as Record<SecretariatGroup, number>,
    };
    // cellsFor is intentionally derived from the three primitive filter states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, funding, group, priority]);

  const tiles = useMemo<OverviewTile[]>(() => {
    if (!current) return [];
    const needle = query.trim().toLocaleLowerCase();
    const built: OverviewTile[] = [];
    for (const entity of current.entities) {
      if (group && entity.group !== group) continue;
      if (needle && !entity.code.toLocaleLowerCase().includes(needle)) continue;
      const baseCells = entity.cells.filter(
        (cell) => !funding || cell.funding_source === funding,
      );
      const total = sumCells(baseCells);
      if (total <= 0) continue;

      if (priority) {
        const selectedAmount = sumCells(
          baseCells.filter((cell) => cell.priority_area === priority),
        );
        if (selectedAmount <= 0) continue;
        built.push({
          id: entity.code,
          entity,
          placement: priority,
          value: total,
          selectedAmount,
        });
      } else if (entity.split_across_priorities) {
        for (const placement of current.meta.priorities) {
          const value = sumCells(
            baseCells.filter((cell) => cell.priority_area === placement),
          );
          if (value > 0) {
            built.push({
              id: `${entity.code}-${placement}`,
              entity,
              placement,
              value,
              selectedAmount: null,
            });
          }
        }
      } else {
        built.push({
          id: entity.code,
          entity,
          placement: entity.primary_priority,
          value: total,
          selectedAmount: null,
        });
      }
    }
    return built;
  }, [current, funding, group, priority, query]);

  const groups = useMemo(() => {
    if (!current) return [];
    const grouped = new Map<string, OverviewTile[]>();
    for (const tile of tiles) {
      const list = grouped.get(tile.placement) ?? [];
      list.push(tile);
      grouped.set(tile.placement, list);
    }
    return current.meta.priorities
      .map((name) => {
        const groupTiles = grouped.get(name) ?? [];
        return {
          name,
          tiles: groupTiles,
          total: groupTiles.reduce((sum, tile) => sum + tile.value, 0),
        };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [current, tiles]);

  const groupRects = layoutGroups(
    groups.map((item) => ({ key: item.name, total: item.total })),
    100,
    100,
    0.4,
    5,
  );
  const hasFilters = priority || funding || group;

  if (!current && !error) {
    return (
      <div className="flex h-[720px] items-center justify-center bg-gray-50 text-gray-500">
        Loading Secretariat expenses…
      </div>
    );
  }
  if (!current) {
    return (
      <div className="flex h-80 items-center justify-center bg-red-50 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search entities..."
        />
        <YearSlider
          years={years.years}
          selectedYear={year}
          onChange={setYear}
        />
      </div>

      <div className="mb-8 space-y-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <SecretariatStackedBar
          label="Priority area"
          info={`Priority-area amounts use the full source allocation. Entity tiles use one primary priority for placement, except Staff Assessment, which remains split. ${current.meta.classification_note}`}
          segments={barSegments.priority}
          selected={priority}
          onSelect={setPriority}
        />
        <SecretariatStackedBar
          label="Funding type"
          segments={barSegments.funding}
          selected={funding}
          onSelect={(key) => setFunding(key as SecretariatFundingSource | null)}
        />
        <SecretariatGroupBar
          groups={current.meta.groups}
          amounts={barSegments.groupAmounts}
          selected={group}
          onSelect={setGroup}
        />
        {hasFilters && (
          <div className="flex justify-end border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setPriority(null);
                setFunding(null);
                setGroup(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-un-blue hover:underline"
            >
              <RotateCcw className="size-3" /> Reset filters
            </button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <span>
          {tiles.length} tile{tiles.length === 1 ? "" : "s"} · tile area uses
          entity total{funding ? ` for ${FUNDING_SOURCES[funding].label}` : ""}
        </span>
        {priority && (
          <span>
            Colour shows the {priority} share; grey shows all other priorities.
          </span>
        )}
      </div>

      <div className="relative h-[720px] w-full overflow-hidden bg-gray-100">
        {groupRects.map((groupRect) => {
          const priorityGroup = groups.find(
            (item) => item.name === groupRect.key,
          )!;
          const sortedTiles = [...priorityGroup.tiles].sort(
            (a, b) => b.value - a.value || a.id.localeCompare(b.id),
          );
          const peaceSubgroups =
            priorityGroup.name === PEACE_AND_SECURITY_PRIORITY
              ? (["pko", "spm", "other"] as const)
                  .map((key) => {
                    const subgroupTiles = sortedTiles.filter((tile) =>
                      key === "other"
                        ? tile.entity.group !== "pko" &&
                          tile.entity.group !== "spm"
                        : tile.entity.group === key,
                    );
                    return {
                      key,
                      tiles: subgroupTiles,
                      total: subgroupTiles.reduce(
                        (sum, tile) => sum + tile.value,
                        0,
                      ),
                    };
                  })
                  .filter((subgroup) => subgroup.total > 0)
              : [];
          const subgroupRects = squarifyDense(
            peaceSubgroups.map((subgroup) => ({
              value: subgroup.total,
              data: subgroup,
            })),
            groupRect.x,
            groupRect.y,
            groupRect.width,
            groupRect.height,
          );
          const rects =
            subgroupRects.length > 0
              ? subgroupRects.flatMap((subgroupRect) =>
                  squarifyDense(
                    subgroupRect.data.tiles.map((tile) => ({
                      value: tile.value,
                      data: tile,
                    })),
                    subgroupRect.x,
                    subgroupRect.y,
                    subgroupRect.width,
                    subgroupRect.height,
                  ),
                )
              : squarifyDense(
                  sortedTiles.map((tile) => ({
                    value: tile.value,
                    data: tile,
                  })),
                  groupRect.x,
                  groupRect.y,
                  groupRect.width,
                  groupRect.height,
                );
          const color = priorityColor(priorityGroup.name);
          return (
            <div key={priorityGroup.name}>
              <div
                className="pointer-events-none absolute z-20 max-w-[60%] truncate bg-white/90 px-1.5 py-1 text-[10px] font-bold shadow-sm sm:text-xs"
                style={{
                  left: `${groupRect.x}%`,
                  top: `${groupRect.y}%`,
                  color,
                }}
              >
                {priorityGroup.name}
              </div>
              {rects.map((rect) => {
                const tile = rect.data;
                const share =
                  tile.selectedAmount === null
                    ? 1
                    : Math.max(
                        0,
                        Math.min(1, tile.selectedAmount / tile.value),
                      );
                const showName = rect.width > 4 && rect.height > 3;
                const title =
                  tile.selectedAmount === null
                    ? `${tile.entity.code}: ${formatBudget(tile.value)}`
                    : `${tile.entity.code}: ${formatBudget(tile.selectedAmount)} of ${formatBudget(tile.value)} (${(share * 100).toFixed(1)}%) spent on ${priority}`;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    title={title}
                    aria-label={title}
                    onClick={() => {
                      setSelectedCode(tile.entity.code);
                      replaceToSidebar("secretariat-entity", tile.entity.code);
                    }}
                    className="absolute overflow-hidden text-left text-white transition-[filter] hover:z-10 hover:brightness-90 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
                    style={{
                      left: `${rect.x}%`,
                      top: `${rect.y}%`,
                      width: `${rect.width}%`,
                      height: `${rect.height}%`,
                      backgroundColor: priority ? "#d1d5db" : color,
                    }}
                  >
                    {priority && (
                      <span
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${share * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.8)]"
                    />
                    {showName && (
                      <span className="relative z-[2] flex h-full items-end overflow-hidden p-1.5 text-[10px] leading-tight drop-shadow-sm sm:p-2 sm:text-xs">
                        <span className="block truncate font-semibold">
                          {tile.entity.code === "STA"
                            ? "Staff Assessment"
                            : tile.entity.code}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
              {subgroupRects.map((subgroupRect) => (
                <div
                  key={`${priorityGroup.name}-${subgroupRect.data.key}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute z-[5] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.95)]"
                  style={{
                    left: `${subgroupRect.x}%`,
                    top: `${subgroupRect.y}%`,
                    width: `${subgroupRect.width}%`,
                    height: `${subgroupRect.height}%`,
                  }}
                />
              ))}
            </div>
          );
        })}
        {tiles.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No entities match the active filters.
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1 text-xs leading-relaxed text-gray-500">
        <p>
          {current.meta.source.label}. Values are expenses in USD and may
          include negative corrections.
        </p>
        <a
          href={current.meta.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue hover:underline"
        >
          Source methodology
        </a>
      </div>

      {selectedEntity && (
        <SecretariatEntitySidebar
          key={`${selectedEntity.code}-${year}`}
          entity={selectedEntity}
          year={year}
          groupLabel={current.meta.groups[selectedEntity.group].label}
          selectedPriority={priority}
          onClose={() => {
            setSelectedCode(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
