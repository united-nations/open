"use client";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFooter } from "@/components/ChartFooter";
import { FinancingInstrumentLabel } from "./FinancingInstrumentLabel";

import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntitySidebar } from "@/components/EntitySidebar";
import { YearSlider } from "@/components/YearSlider";
import { ClickHint } from "@/components/ui/ClickHint";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
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
  type FinancingInstrumentType,
} from "@/lib/financingInstruments";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { generateYearRange, useYearRanges } from "@/lib/useYearRanges";
import type { BudgetEntry, Entity, EntityRevenue } from "@/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Preserve each system group's hue while distinguishing its funding sources.
const FUNDING_SHADE_STRENGTH: Record<FinancingInstrumentType, number> = {
  Assessed: 0,
  "Voluntary un-earmarked": 1,
  "Voluntary earmarked": 2,
  Other: 3,
};

function fundingSegmentColor(
  baseColor: string,
  type: FinancingInstrumentType,
  darkText: boolean,
): string {
  const shade = FUNDING_SHADE_STRENGTH[type];
  // Light groups keep dark labels; dark groups keep light labels.
  const percentage = darkText ? 100 - shade * 20 : 64 + shade * 12;
  return `color-mix(in srgb, ${baseColor} ${percentage}%, ${darkText ? "white" : "black"})`;
}

const accessibleBudget = sharedFormatBudget;

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
  const [hiddenFunding, setHiddenFunding] = useState<FinancingInstrumentType[]>(
    [],
  );
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedSpendingYear, setLoadedSpendingYear] = useState<number | null>(
    null,
  );
  const [loadedRevenueYear, setLoadedRevenueYear] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentYear, setCurrentYear] = useState(
    yearRanges.entitySpending.default,
  );
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "entity",
    sectionId: "entities",
    onNavigateAway: () => setSelectedEntity(null),
  });

  const currentYears = Array.from(
    new Set([...spendingYears, ...revenueYears]),
  ).sort((a, b) => a - b);

  useEffect(() => {
    fetch(`${basePath}/data/entities.json`)
      .then((response) => response.json())
      .then((data: Entity[]) => setEntities(data))
      .catch((error) => console.error("Failed to load entities:", error));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (
      currentYear < yearRanges.entitySpending.min ||
      currentYear > yearRanges.entitySpending.max
    ) {
      setSpendingData({});
      setLoadedSpendingYear(currentYear);
      setLoading(false);
      return;
    }
    fetch(`${basePath}/data/entity-spending-${currentYear}.json`)
      .then((response) => response.json())
      .then((entries: BudgetEntry[]) => {
        if (cancelled) return;
        setLoadedSpendingYear(currentYear);
        setSpendingData(
          Object.fromEntries(
            entries.map((entry) => [entry.entity, entry.amount]),
          ),
        );
        if (!showRevenue) setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load expenses data:", error);
        if (!showRevenue) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    showRevenue,
    currentYear,
    yearRanges.entitySpending.min,
    yearRanges.entitySpending.max,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (
      currentYear < yearRanges.entityRevenue.min ||
      currentYear > yearRanges.entityRevenue.max
    ) {
      setRevenueData({});
      setLoadedRevenueYear(currentYear);
      setLoading(false);
      return;
    }
    fetch(`${basePath}/data/entity-revenue-${currentYear}.json`)
      .then((response) => response.json())
      .then((data: Record<string, EntityRevenue>) => {
        if (cancelled) return;
        setRevenueData(data);
        setLoadedRevenueYear(currentYear);
        if (showRevenue) setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load revenue data:", error);
        if (showRevenue) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    currentYear,
    showRevenue,
    yearRanges.entityRevenue.min,
    yearRanges.entityRevenue.max,
  ]);

  const budgetData = useMemo(
    () =>
      showRevenue
        ? Object.fromEntries(
            Object.entries(revenueData).map(([entity, value]) => [
              entity,
              hiddenFunding.length === 0
                ? value.total
                : FINANCING_INSTRUMENT_ORDER.filter(
                    (type) => !hiddenFunding.includes(type),
                  ).reduce((sum, type) => sum + (value.by_type[type] ?? 0), 0),
            ]),
          )
        : spendingData,
    [revenueData, showRevenue, spendingData, hiddenFunding],
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
        ([entity]) => metadata.get(entity) ?? createUncategorizedEntity(entity),
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
    () => new Map(activeEntities.map((entity) => [entity.entity, entity])),
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
                ? [...FINANCING_INSTRUMENT_ORDER]
                    .reverse()
                    .filter((type) => !hiddenFunding.includes(type))
                    .map((type) => ({
                      key: type,
                      label: type,
                      value: revenueData[entity.entity]?.by_type[type] ?? 0,
                      color: fundingSegmentColor(
                        style.hexColor ?? "var(--color-un-blue)",
                        type,
                        style.textColor === "text-black",
                      ),
                      data: type,
                    }))
                    .filter((segment) => segment.value > 0)
                : undefined,
              onActivate: () => openEntity(entity),
            })),
        } satisfies GroupedTreemapRow<string, never, Entity, string>;
      });
  }, [
    activeEntities,
    budgetData,
    openEntity,
    revenueData,
    showRevenue,
    hiddenFunding,
  ]);

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-500">Loading entities...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <DelayedChartLoading
        pending={
          (showRevenue ? loadedRevenueYear : loadedSpendingYear) !== currentYear
        }
        requestKey={`${showRevenue}-${currentYear}`}
      />
      <GroupedTreemap<string, never, Entity, string>
        secondaryControls={
          <div
            className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-500 motion-safe:ease-in-out ${showRevenue ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
            aria-hidden={!showRevenue}
            inert={!showRevenue}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-wrap gap-2 pt-3">
                {FINANCING_INSTRUMENT_ORDER.map((type) => (
                  <FinancingInstrumentLabel
                    key={type}
                    type={type}
                    variant="pill"
                    selected={!hiddenFunding.includes(type)}
                    onToggle={() =>
                      setHiddenFunding((current) =>
                        current.includes(type)
                          ? current.filter((item) => item !== type)
                          : [...current, type],
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        }
        footer={
          <ChartFooter hint="Click on an organization to explore details" />
        }
        yearControl={
          <YearSlider
            years={currentYears}
            selectedYear={currentYear}
            onChange={setCurrentYear}
          />
        }
        controls={
          <>
            <BinaryToggle
              variant="segmented"
              label="Financial measure"
              options={[
                { value: "funding", label: "Funding" },
                { value: "spending", label: "Spending" },
              ]}
              value={showRevenue ? "funding" : "spending"}
              onValueChange={(value) => setShowRevenue(value === "funding")}
            />
          </>
        }
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
          spending={
            loadedSpendingYear === currentYear
              ? spendingData[selectedEntity.entity] || 0
              : 0
          }
          revenue={
            loadedRevenueYear === currentYear
              ? revenueData[selectedEntity.entity] || null
              : null
          }
          initialYear={currentYear}
          initialDataComplete={
            loadedSpendingYear === currentYear &&
            loadedRevenueYear === currentYear
          }
          onClose={() => {
            setSelectedEntity(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
