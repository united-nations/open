"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FundingSourcePills,
  toggleFundingSource,
} from "@/components/FundingSourcePills";
import { SecretariatEntitySidebar } from "@/components/SecretariatEntitySidebar";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SOURCES,
  type BudgetFundingSource,
} from "@/lib/budgetGroupings";
import { SecretariatOverviewTrends } from "@/components/SecretariatOverviewTrends";
import { priorityAreaColor } from "@/lib/secretariatGroupings";
import { layoutGroups, squarifyDense } from "@/lib/treemapLayout";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  SecretariatOverviewCell,
  SecretariatOverviewData,
  SecretariatOverviewEntity,
} from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

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
}

export function SecretariatOverview() {
  const years = useYearRanges().secretariatOverview;
  const [year, setYear] = useState(years.default);
  const [data, setData] = useState<SecretariatOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeFunding, setActiveFunding] = useState<BudgetFundingSource[]>([
    ...BUDGET_FUNDING_SOURCES,
  ]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [pending, setPending] = useDeepLink({
    hashPrefix: "secretariat-entity",
    sectionId: "priorities",
    onNavigateAway: () => setSelectedCode(null),
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/data/secretariat-overview-${year}.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${year} data`);
        return response.json() as Promise<SecretariatOverviewData>;
      })
      .then((overview) => {
        setError(null);
        setData(overview);
      })
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

  const fundingSet = useMemo(() => new Set(activeFunding), [activeFunding]);

  const tiles = useMemo<OverviewTile[]>(() => {
    if (!current) return [];
    const needle = query.trim().toLocaleLowerCase();
    const built: OverviewTile[] = [];
    for (const entity of current.entities) {
      if (needle && !entity.code.toLocaleLowerCase().includes(needle)) continue;
      const baseCells = entity.cells.filter((cell) =>
        fundingSet.has(cell.funding_source),
      );
      const total = sumCells(baseCells);
      if (total <= 0) continue;

      if (entity.split_across_priorities) {
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
            });
          }
        }
      } else {
        built.push({
          id: entity.code,
          entity,
          placement: entity.primary_priority,
          value: total,
        });
      }
    }
    return built;
  }, [current, fundingSet, query]);

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

  const priorityTotals = useMemo(() => {
    if (!current) return [];
    const amounts = new Map<string, number>();
    for (const entity of current.entities) {
      for (const cell of entity.cells) {
        if (!fundingSet.has(cell.funding_source)) continue;
        amounts.set(
          cell.priority_area,
          (amounts.get(cell.priority_area) ?? 0) + cell.amount,
        );
      }
    }
    return current.meta.priorities
      .map((name) => ({ key: name, total: amounts.get(name) ?? 0 }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  }, [current, fundingSet]);

  const groupRects = layoutGroups(
    groups.map((item) => ({ key: item.name, total: item.total })),
    100,
    100,
    0.4,
    5,
  );
  const priorityRects = layoutGroups(priorityTotals, 100, 100, 0.4, 5);

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

  const listedPriorities = priorityTotals.map((item) => item.key);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="mb-4 max-w-xl">
          <YearSlider
            years={years.years}
            selectedYear={year}
            onChange={setYear}
          />
        </div>
        <FundingSourcePills
          selected={activeFunding}
          onToggle={(source) =>
            setActiveFunding((currentSources) =>
              toggleFundingSource(currentSources, source),
            )
          }
        />
      </div>

      <div className="mb-10 grid gap-8 md:grid-cols-2 md:items-start">
        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-600 uppercase">
            Priority areas
          </h3>
          <ul className="space-y-2">
            {listedPriorities.map((name) => (
              <li key={name} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: priorityAreaColor(name) }}
                  aria-hidden="true"
                />
                <p className="text-sm text-gray-900">{name}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-600 uppercase">
            Spending by priority area
          </h3>
          <div
            className="relative h-72 w-full overflow-hidden bg-gray-100 md:h-80"
            role="img"
            aria-label="Secretariat expenses by priority area"
          >
            {priorityRects.map((rect) => {
              const total =
                priorityTotals.find((item) => item.key === rect.key)?.total ??
                0;
              const color = priorityAreaColor(rect.key);
              const showLabel = rect.width > 12 && rect.height > 10;
              return (
                <div
                  key={rect.key}
                  className="absolute overflow-hidden text-white"
                  title={`${rect.key}: ${formatBudget(total)}`}
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: color,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.85)",
                  }}
                >
                  {showLabel && (
                    <div className="p-2">
                      <div className="text-[11px] leading-tight font-semibold sm:text-xs">
                        {rect.key}
                      </div>
                      <div className="mt-0.5 text-[10px] leading-tight opacity-90">
                        {formatBudget(total)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search entities..."
        />
        <span className="text-xs text-gray-600">
          {tiles.length} tile{tiles.length === 1 ? "" : "s"} · tile area uses
          entity total
          {activeFunding.length < BUDGET_FUNDING_SOURCES.length
            ? ` for ${activeFunding.map((source) => FUNDING_SOURCES[source].label).join(", ")}`
            : ""}
        </span>
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
          const color = priorityAreaColor(priorityGroup.name);
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
                const showName = rect.width > 4 && rect.height > 3;
                const title = `${tile.entity.code}: ${formatBudget(tile.value)}`;
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
                      backgroundColor: color,
                    }}
                  >
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

      <SecretariatOverviewTrends />

      {selectedEntity && (
        <SecretariatEntitySidebar
          key={`${selectedEntity.code}-${year}`}
          entity={selectedEntity}
          year={year}
          groupLabel={current.meta.groups[selectedEntity.group].label}
          selectedPriority={null}
          onClose={() => {
            setSelectedCode(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
