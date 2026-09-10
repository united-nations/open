"use client";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntitySidebar } from "@/components/EntitySidebar";
import { YearSlider } from "@/components/YearSlider";
import { ClickHint } from "@/components/ui/ClickHint";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  clearSidebarHash,
  replaceToSidebar,
  useDeepLink,
} from "@/hooks/useDeepLink";
import {
  createUncategorizedEntity,
  formatBudget,
  normalizeEntityForDisplay,
} from "@/lib/entities";
import {
  FINANCING_INSTRUMENT_ORDER,
  FINANCING_INSTRUMENT_TOOLTIPS,
  getFinancingInstrumentColor,
} from "@/lib/financingInstruments";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { generateYearRange, useYearRanges } from "@/lib/useYearRanges";
import type { BudgetEntry, Entity, EntityRevenue } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function accessibleBudget(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function matchesEntity(entity: Entity, query: string): boolean {
  const term = query.trim().toLocaleLowerCase();
  return (
    !term ||
    entity.entity.toLocaleLowerCase().includes(term) ||
    entity.entity_long.toLocaleLowerCase().includes(term)
  );
}

function EntityTooltip({
  context,
}: {
  context: GroupedTreemapTooltipContext<string, never, Entity, string>;
}) {
  const entity = context.leaf.data;
  if (!entity) return null;

  return (
    <div className="space-y-1 text-center">
      <p className="text-sm font-semibold">{entity.entity_long}</p>
      <div className="flex items-center justify-center gap-1.5 text-xs opacity-75">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: context.row.color }}
        />
        <span>{context.row.label}</span>
      </div>
      <p className="text-xs font-semibold">
        {accessibleBudget(context.leaf.value)}
      </p>
      {context.leaf.segments?.map((segment) => (
        <div
          key={segment.key}
          className="flex items-center justify-between gap-4 text-xs"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            {segment.label}
          </span>
          <span className="tabular-nums">
            {accessibleBudget(segment.value)}
          </span>
        </div>
      ))}
      <ClickHint />
    </div>
  );
}

export function EntitiesTreemap() {
  const yearRanges = useYearRanges();
  const spendingYears = generateYearRange(
    yearRanges.entitySpending.min,
    yearRanges.entitySpending.max,
  );
  const revenueYears = generateYearRange(
    yearRanges.entityRevenue.min,
    yearRanges.entityRevenue.max,
  );

  const [entities, setEntities] = useState<Entity[]>([]);
  const [spendingData, setSpendingData] = useState<Record<string, number>>({});
  const [revenueData, setRevenueData] = useState<Record<string, EntityRevenue>>(
    {},
  );
  const [showRevenue, setShowRevenue] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [spendingYear, setSpendingYear] = useState(
    yearRanges.entitySpending.default,
  );
  const [revenueYear, setRevenueYear] = useState(
    yearRanges.entityRevenue.default,
  );
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "entity",
    sectionId: "entities",
    onNavigateAway: () => setSelectedEntity(null),
  });

  const currentYear = showRevenue ? revenueYear : spendingYear;
  const currentYears = showRevenue ? revenueYears : spendingYears;
  const setCurrentYear = showRevenue ? setRevenueYear : setSpendingYear;

  useEffect(() => {
    fetch(`${basePath}/data/entities.json`)
      .then((response) => response.json())
      .then((data: Entity[]) => setEntities(data))
      .catch((error) => console.error("Failed to load entities:", error));
  }, []);

  useEffect(() => {
    fetch(`${basePath}/data/entity-spending-${spendingYear}.json`)
      .then((response) => response.json())
      .then((entries: BudgetEntry[]) => {
        setSpendingData(
          Object.fromEntries(
            entries.map((entry) => [entry.entity, entry.amount]),
          ),
        );
        if (!showRevenue) setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load expenses data:", error);
        if (!showRevenue) setLoading(false);
      });
  }, [showRevenue, spendingYear]);

  useEffect(() => {
    fetch(`${basePath}/data/entity-revenue-${revenueYear}.json`)
      .then((response) => response.json())
      .then((data: Record<string, EntityRevenue>) => {
        setRevenueData(data);
        if (showRevenue) setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load revenue data:", error);
        if (showRevenue) setLoading(false);
      });
  }, [revenueYear, showRevenue]);

  const budgetData = useMemo(
    () =>
      showRevenue
        ? Object.fromEntries(
            Object.entries(revenueData).map(([entity, value]) => [
              entity,
              value.total,
            ]),
          )
        : spendingData,
    [revenueData, showRevenue, spendingData],
  );

  const activeEntities = useMemo(() => {
    const metadata = new Map(
      entities
        .filter((entity) => entity.entity)
        .map((entity) => [entity.entity, normalizeEntityForDisplay(entity)]),
    );
    return Object.entries(budgetData)
      .filter(([entity, amount]) => entity && amount > 0)
      .map(
        ([entity]) =>
          metadata.get(entity) ?? createUncategorizedEntity(entity),
      );
  }, [budgetData, entities]);

  useEffect(() => {
    if (loading || !pendingDeepLink) return;
    const timer = window.setTimeout(() => {
      const entity = activeEntities.find(
        (candidate) => candidate.entity === pendingDeepLink,
      );
      if (entity) setSelectedEntity(entity);
      setPendingDeepLink(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeEntities, loading, pendingDeepLink, setPendingDeepLink]);

  const openEntity = useCallback((entity: Entity) => {
    setSelectedEntity(entity);
    replaceToSidebar("entity", entity.entity);
  }, []);

  const entitiesByTileLabel = useMemo(
    () =>
      new Map(
        activeEntities.map((entity) => [entity.entity, entity]),
      ),
    [activeEntities],
  );

  const rows = useMemo(() => {
    const grouped = activeEntities.reduce<Record<string, Entity[]>>(
      (result, entity) => {
        (result[entity.system_grouping] ??= []).push(entity);
        return result;
      },
      {},
    );

    return Object.entries(grouped)
      .sort(([groupA], [groupB]) => {
        const styleA = getSystemGroupingStyle(groupA);
        const styleB = getSystemGroupingStyle(groupB);
        return styleA.order - styleB.order || groupA.localeCompare(groupB);
      })
      .map(([group, members]) => {
        const style = getSystemGroupingStyle(group);
        return {
          key: group,
          label: style.label,
          color: style.hexColor,
          data: group,
          leaves: members
            .slice()
            .sort(
              (a, b) =>
                (budgetData[b.entity] ?? 0) - (budgetData[a.entity] ?? 0) ||
                a.entity.localeCompare(b.entity),
            )
            .map((entity) => ({
              key: entity.entity,
              label: entity.entity,
              value: budgetData[entity.entity] ?? 0,
              color: style.hexColor,
              textColor:
                style.textColor === "text-black"
                  ? "var(--color-un-black)"
                  : "var(--color-un-white)",
              data: entity,
              segments: showRevenue
                ? FINANCING_INSTRUMENT_ORDER.map((type) => ({
                    key: type,
                    label: type,
                    value: revenueData[entity.entity]?.by_type[type] ?? 0,
                    color: getFinancingInstrumentColor(type),
                    data: type,
                  })).filter((segment) => segment.value > 0)
                : undefined,
              onActivate: () => openEntity(entity),
            })),
        } satisfies GroupedTreemapRow<string, never, Entity, string>;
      });
  }, [activeEntities, budgetData, openEntity, revenueData, showRevenue]);

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Loading entities...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-end justify-end gap-4">
        <YearSlider
          years={currentYears}
          selectedYear={currentYear}
          onChange={setCurrentYear}
        />
        <div className="flex h-9 items-center gap-2">
          <span
            className={`text-sm ${showRevenue ? "font-medium text-gray-900" : "text-gray-500"}`}
          >
            Funding
          </span>
          <Switch
            checked={!showRevenue}
            onCheckedChange={(checked) => setShowRevenue(!checked)}
            aria-label="Toggle between funding and spending"
          />
          <span
            className={`text-sm ${!showRevenue ? "font-medium text-gray-900" : "text-gray-500"}`}
          >
            Spending
          </span>
        </div>
      </div>

      {showRevenue && (
        <div className="mb-3 flex flex-wrap gap-3">
          {FINANCING_INSTRUMENT_ORDER.map((type) => (
            <Tooltip key={type} delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor: getFinancingInstrumentColor(type),
                    }}
                  />
                  <span className="text-xs text-gray-600 underline decoration-dotted underline-offset-2">
                    {type}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={4}
                className="max-w-[250px] border border-slate-200 bg-white text-slate-800 shadow-lg"
              >
                <p className="text-xs">{FINANCING_INSTRUMENT_TOOLTIPS[type]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      <GroupedTreemap<string, never, Entity, string>
        rows={rows}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          label: "Search entities",
          placeholder: "Search entities...",
          predicate: (leafLabel, _subgroupLabel, _rowLabel, query) => {
            const entity = entitiesByTileLabel.get(leafLabel);
            return entity ? matchesEntity(entity, query) : false;
          },
        }}
        totalLabel="Total"
        showLeafValues
        plotClassName="h-[650px]"
        formatValue={formatBudget}
        formatAccessibleValue={accessibleBudget}
        renderTooltip={(context) => <EntityTooltip context={context} />}
        emptyContent={
          <div className="flex h-full items-center justify-center text-lg text-gray-500">
            No entities match the selected filters
          </div>
        }
      />

      {selectedEntity && (
        <EntitySidebar
          entity={selectedEntity}
          spending={spendingData[selectedEntity.entity] || 0}
          revenue={revenueData[selectedEntity.entity] || null}
          initialYear={revenueYear}
          onClose={() => {
            setSelectedEntity(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
