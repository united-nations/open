"use client";
import { orderFundingTooltipRows } from "@/lib/financingInstruments";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFooter } from "@/components/ChartFooter";

import {
  GroupedTreemap,
  type GroupedTreemapLeaf,
  type GroupedTreemapRow,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FundingSourcePills,
  toggleFundingSource,
} from "@/components/FundingSourcePills";
import { SecretariatEntitySidebar } from "@/components/SecretariatEntitySidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import {
  BUDGET_FUNDING_SOURCES,
  type BudgetFundingSource,
} from "@/lib/budgetGroupings";
import { SecretariatOverviewTrends } from "@/components/SecretariatOverviewTrends";
import { priorityAreaColor } from "@/lib/secretariatGroupings";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  Entity,
  SecretariatGroup,
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
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    fetch(`${basePath}/data/entities.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Entity names unavailable");
        return response.json() as Promise<Entity[]>;
      })
      .then((entities) => {
        if (active)
          setEntityNames(
            Object.fromEntries(
              entities
                .filter((entity) => entity.entity_long)
                .map((entity) => [entity.entity, entity.entity_long]),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  const current = data;
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
  const openEntity = useCallback((entity: SecretariatOverviewEntity) => {
    setSelectedCode(entity.code);
    replaceToSidebar("secretariat-entity", entity.code);
  }, []);

  const signedAmounts = (current?.entities ?? [])
    .filter((entity) =>
      entity.code
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    )
    .flatMap((entity) => {
      const cells = entity.cells.filter((cell) =>
        fundingSet.has(cell.funding_source),
      );
      return entity.split_across_priorities
        ? (current?.meta.priorities ?? []).map((priority) => ({
            group: priority,
            label: entity.code,
            amount: sumCells(
              cells.filter((cell) => cell.priority_area === priority),
            ),
          }))
        : [
            {
              group: entity.primary_priority,
              label: entity.code,
              amount: sumCells(cells),
            },
          ];
    });
  const tiles = useMemo<OverviewTile[]>(() => {
    if (!current) return [];
    const built: OverviewTile[] = [];
    for (const entity of current.entities) {
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
  }, [current, fundingSet]);

  const rows = useMemo(() => {
    if (!current) return [];
    const builtRows: GroupedTreemapRow<
      string,
      SecretariatGroup,
      OverviewTile,
      never
    >[] = [];
    const grouped = new Map<string, OverviewTile[]>();
    for (const tile of tiles) {
      const list = grouped.get(tile.placement) ?? [];
      list.push(tile);
      grouped.set(tile.placement, list);
    }
    for (const name of current.meta.priorities) {
      const groupTiles = grouped.get(name) ?? [];
      if (groupTiles.length === 0) continue;
      const sortedTiles = [...groupTiles].sort(
        (a, b) => b.value - a.value || a.id.localeCompare(b.id),
      );
      const toLeaf = (
        tile: OverviewTile,
      ): GroupedTreemapLeaf<OverviewTile, never> => ({
        key: tile.id,
        label:
          tile.entity.code === "STA" ? "Staff Assessment" : tile.entity.code,
        value: tile.value,
        data: tile,
        onActivate: () => openEntity(tile.entity),
      });
      const base = {
        key: name,
        label: name,
        color: priorityAreaColor(name),
        data: name,
      };

      if (name !== PEACE_AND_SECURITY_PRIORITY) {
        builtRows.push({ ...base, leaves: sortedTiles.map(toLeaf) });
        continue;
      }

      const subgroupOrder: SecretariatGroup[] = ["pko", "spm", "other"];
      builtRows.push({
        ...base,
        subgroups: subgroupOrder.flatMap((key) => {
          const subgroupTiles = sortedTiles.filter((tile) =>
            key === "other"
              ? tile.entity.group !== "pko" && tile.entity.group !== "spm"
              : tile.entity.group === key,
          );
          return subgroupTiles.length > 0
            ? [
                {
                  key,
                  label:
                    key === "other"
                      ? "Other peace and security entities"
                      : current.meta.groups[key].label,
                  data: key,
                  labelVisibility: "tooltip-only" as const,
                  leaves: subgroupTiles.map(toLeaf),
                },
              ]
            : [];
        }),
      });
    }
    return builtRows;
  }, [current, openEntity, tiles]);
  const entityCodeByLabel = useMemo(
    () =>
      new Map(
        tiles.map((tile) => [
          tile.entity.code === "STA" ? "Staff Assessment" : tile.entity.code,
          tile.entity.code,
        ]),
      ),
    [tiles],
  );

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
    <div className="relative w-full">
      <DelayedChartLoading
        pending={data?.meta.year !== year}
        requestKey={year}
      />
      <GroupedTreemap<string, SecretariatGroup, OverviewTile, never>
        footer={
          <ChartFooter
            hint="Click on an entity to explore details"
            signedAmounts={signedAmounts}
          />
        }
        yearControl={
          <YearSlider
            years={years.years}
            selectedYear={year}
            onChange={setYear}
          />
        }
        controls={
          <FundingSourcePills
            neutral
            selected={activeFunding}
            onToggle={(source) =>
              setActiveFunding((currentSources) =>
                toggleFundingSource(currentSources, source),
              )
            }
          />
        }
        rows={rows.map((row) => ({
          ...row,
          value: signedAmounts
            .filter((item) => item.group === row.key)
            .reduce((sum, item) => sum + item.amount, 0),
        }))}
        search={{
          value: query,
          onChange: setQuery,
          label: "Search entities",
          placeholder: "Search entities...",
          predicate: (leafLabel, _subgroupLabel, _rowLabel, needle) =>
            (entityCodeByLabel.get(leafLabel) ?? leafLabel)
              .toLocaleLowerCase()
              .includes(needle.trim().toLocaleLowerCase()),
        }}
        summaries={[
          {
            key: "net",
            label: query ? "Matching total" : "Total",
            value: formatBudget(
              signedAmounts.reduce((sum, item) => sum + item.amount, 0),
            ),
          },
        ]}
        totalLabel="Total"
        height={720}
        formatValue={formatBudget}
        formatAccessibleValue={formatBudget}
        renderTooltip={({ row, leaf }) => (
          <FinancialTooltip
            title={entityNames[leaf.data?.entity.code ?? ""] ?? leaf.label}
            parents={[{ label: row.label, color: row.color }]}
            total={{ label: "Spending", value: formatBudget(leaf.value) }}
            rows={orderFundingTooltipRows(leaf.segments).map((segment) => ({
              label: segment.label,
              value: formatBudget(segment.value),
              color: segment.color,
              share:
                leaf.value > 0 && segment.value >= 0
                  ? segment.value / leaf.value
                  : undefined,
            }))}
            actionHint="Click to explore details"
          />
        )}
        emptyContent={
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No entities match the active filters.
          </div>
        }
      />

      <SecretariatOverviewTrends />

      {selectedEntity && (
        <SecretariatEntitySidebar
          key={`${selectedEntity.code}-${year}`}
          entity={selectedEntity}
          year={year}
          source={current.meta.source}
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
