"use client";
import { orderFundingTooltipRows } from "@/lib/financingInstruments";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
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
import { useYearRanges } from "@/lib/useYearRanges";
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
  showRevenue,
}: {
  context: GroupedTreemapTooltipContext<string, never, Entity, string>;
  showRevenue: boolean;
}) {
  const entity = context.leaf.data;
  if (!entity) return null;

  return (
    <FinancialTooltip
      title={entity.entity_long || entity.entity}
      parents={[{ label: context.row.label, color: context.row.color }]}
      total={{
        label: showRevenue ? "Funding" : "Spending",
        value: accessibleBudget(context.leaf.value),
      }}
      rows={orderFundingTooltipRows(context.leaf.segments).map((segment) => ({
        label: segment.label,
        value: accessibleBudget(segment.value),
        color: segment.color,
        share:
          segment.value >= 0 && context.leaf.value > 0
            ? segment.value / context.leaf.value
            : undefined,
      }))}
      actionHint="Click to explore details"
    />
  );
}

export function EntitiesTreemap() {
  const yearRanges = useYearRanges();
  const spendingYears = yearRanges.entitySpending.years;
  const revenueYears = yearRanges.entityRevenue.years;

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
  const [errorState, setErrorState] = useState<{
    year: number;
    revenue: boolean;
    message: string;
  } | null>(null);
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
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: Entity[]) => setEntities(data))
      .catch((error) => console.error("Failed to load entities:", error));
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!spendingYears.includes(currentYear)) {
      setSpendingData({});
      setLoadedSpendingYear(currentYear);
      setLoading(false);
      return;
    }
    fetch(`${basePath}/data/entity-spending-${currentYear}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((entries: BudgetEntry[]) => {
        if (cancelled) return;
        if (!showRevenue) setErrorState(null);
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
        setSpendingData({});
        if (!showRevenue)
          setErrorState({
            year: currentYear,
            revenue: false,
            message: `Spending data could not be loaded for ${currentYear}.`,
          });
        if (!showRevenue) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showRevenue, currentYear, spendingYears]);

  useEffect(() => {
    let cancelled = false;
    if (!revenueYears.includes(currentYear)) {
      setRevenueData({});
      setLoadedRevenueYear(currentYear);
      setLoading(false);
      return;
    }
    fetch(`${basePath}/data/entity-revenue-${currentYear}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: Record<string, EntityRevenue>) => {
        if (cancelled) return;
        if (showRevenue) setErrorState(null);
        setRevenueData(data);
        setLoadedRevenueYear(currentYear);
        if (showRevenue) setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load revenue data:", error);
        setRevenueData({});
        if (showRevenue)
          setErrorState({
            year: currentYear,
            revenue: true,
            message: `Funding data could not be loaded for ${currentYear}.`,
          });
        if (showRevenue) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentYear, showRevenue, revenueYears]);

  const loadError =
    errorState?.year === currentYear && errorState.revenue === showRevenue
      ? errorState.message
      : null;
  const dataAvailable = (showRevenue ? revenueYears : spendingYears).includes(
    currentYear,
  );
  const dataReady =
    (showRevenue ? loadedRevenueYear : loadedSpendingYear) === currentYear;

  const budgetData = useMemo(
    () =>
      !dataReady || !dataAvailable
        ? {}
        : showRevenue
          ? Object.fromEntries(
              Object.entries(revenueData).map(([entity, value]) => [
                entity,
                hiddenFunding.length === 0
                  ? value.total
                  : FINANCING_INSTRUMENT_ORDER.filter(
                      (type) => !hiddenFunding.includes(type),
                    ).reduce(
                      (sum, type) => sum + (value.by_type[type] ?? 0),
                      0,
                    ),
              ]),
            )
          : spendingData,
    [
      revenueData,
      showRevenue,
      spendingData,
      hiddenFunding,
      dataReady,
      dataAvailable,
    ],
  );

  const signedEntries = Object.entries(budgetData).filter(([code]) => {
    const entity =
      entities.find((item) => item.entity === code) ??
      createUncategorizedEntity(code);
    return matchesEntity(entity, searchQuery);
  });
  const signedAmounts = signedEntries.map(([code, amount]) => ({
    group:
      entities.find((item) => item.entity === code)?.system_grouping ||
      "Uncategorized",
    label: code,
    amount,
  }));

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
      const requestedYear = Number(
        new URLSearchParams(window.location.search).get("year"),
      );
      if (yearRanges.entitySpending.years.includes(requestedYear)) {
        if (currentYear !== requestedYear) {
          setCurrentYear(requestedYear);
          return;
        }
        if (loadedSpendingYear !== requestedYear) return;
      }
      const entity =
        activeEntities.find(
          (candidate) => candidate.entity === pendingDeepLink,
        ) ??
        entities
          .filter((candidate) => candidate.entity === pendingDeepLink)
          .map(normalizeEntityForDisplay)[0];
      if (entity) setSelectedEntity(entity);
      setPendingDeepLink(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    activeEntities,
    entities,
    loading,
    pendingDeepLink,
    setPendingDeepLink,
    currentYear,
    loadedSpendingYear,
    yearRanges.entitySpending.years,
  ]);

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
              paleFill: style.textColor === "text-black",
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
        pending={!loadError && dataAvailable && !dataReady}
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
                    neutral
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
          <ChartFooter
            hint="Click on an organization to explore details"
            signedAmounts={signedAmounts}
          />
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
        rows={rows.map((row) => ({
          ...row,
          value: signedEntries
            .filter(
              ([code]) =>
                (entities.find((entity) => entity.entity === code)
                  ?.system_grouping || "Uncategorized") === row.key,
            )
            .reduce((sum, [, amount]) => sum + amount, 0),
        }))}
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
        summaries={[
          {
            key: "net",
            label: searchQuery ? "Matching total" : "Total",
            value: !dataAvailable
              ? "Unavailable"
              : loadError
                ? "Unavailable"
                : !dataReady
                  ? "Loading…"
                  : formatBudget(
                      signedEntries.reduce(
                        (sum, [, amount]) => sum + amount,
                        0,
                      ),
                    ),
          },
        ]}
        totalLabel="Total"
        showLeafValues
        plotClassName="h-[650px]"
        formatValue={formatBudget}
        formatAccessibleValue={accessibleBudget}
        renderTooltip={(context) => (
          <EntityTooltip context={context} showRevenue={showRevenue} />
        )}
        emptyContent={
          <div className="flex h-full items-center justify-center text-lg text-gray-500">
            {loadError ||
              (!dataAvailable
                ? `No ${showRevenue ? "funding" : "spending"} data available for ${currentYear}.`
                : !dataReady
                  ? "Loading data…"
                  : "No entities match the selected filters")}
          </div>
        }
      />

      {selectedEntity && dataReady && dataAvailable && !loadError && (
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
