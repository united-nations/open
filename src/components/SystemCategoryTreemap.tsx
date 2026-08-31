"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CEB_AGGREGATE_ENTITIES,
  PEACEKEEPING_OPERATIONS_GROUP,
  SECRETARIAT_PROPER_GROUP,
} from "@/lib/cebAggregates";
import { loadStaticData, loadYearData } from "@/lib/data";
import {
  createUncategorizedEntity,
  formatBudget,
  normalizeEntityForDisplay,
} from "@/lib/entities";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { layoutGroups } from "@/lib/treemapLayout";
import { useYearRanges } from "@/lib/useYearRanges";
import { cn } from "@/lib/utils";
import type { BudgetEntry, Entity, SecretariatEntitiesData } from "@/types";

const SECRETARIAT_GROUPS = new Set([
  SECRETARIAT_PROPER_GROUP,
  PEACEKEEPING_OPERATIONS_GROUP,
]);

const SECRETARIAT_FILL = "#009edb";

function homeGroup(
  entity: Entity,
  pkoCodes: Set<string>,
  aliases: Record<string, string>,
): string {
  const canonical = aliases[entity.entity] ?? entity.entity;
  if (
    entity.entity === "UN-DPO" ||
    canonical === "UN-DPO" ||
    entity.system_grouping === PEACEKEEPING_OPERATIONS_GROUP ||
    pkoCodes.has(entity.entity) ||
    pkoCodes.has(canonical)
  ) {
    return PEACEKEEPING_OPERATIONS_GROUP;
  }
  return entity.system_grouping;
}

export function SystemCategoryTreemap() {
  const year = useYearRanges().entitySpending.default;
  const [entities, setEntities] = useState<Entity[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [pkoCodes, setPkoCodes] = useState<Set<string>>(new Set());
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadStaticData<Entity[]>("entities.json"),
      loadYearData<BudgetEntry[]>("entity-spending", year),
      loadStaticData<SecretariatEntitiesData>("secretariat-entities.json"),
    ])
      .then(([entityList, spendingRows, secretariat]) => {
        if (!active) return;
        setEntities(entityList);
        setSpending(
          spendingRows.reduce<Record<string, number>>((acc, row) => {
            acc[row.entity] = row.amount;
            return acc;
          }, {}),
        );
        setPkoCodes(
          new Set(
            Object.entries(secretariat.entities)
              .filter(([, meta]) => meta.group === "pko")
              .map(([code]) => code),
          ),
        );
        setAliases(secretariat.aliases);
      })
      .catch(() => {
        if (active) setError("Failed to load UN System categories.");
      });
    return () => {
      active = false;
    };
  }, [year]);

  const groups = useMemo(() => {
    const metadata = new Map(
      entities
        .filter((entity) => entity.entity)
        .map((entity) => [entity.entity, normalizeEntityForDisplay(entity)]),
    );
    const synthetics = new Map(
      CEB_AGGREGATE_ENTITIES.map((entity) => [entity.entity, entity]),
    );
    const totals = new Map<string, number>();
    for (const [code, amount] of Object.entries(spending)) {
      if (!code || amount <= 0) continue;
      const entity =
        synthetics.get(code) ||
        metadata.get(code) ||
        createUncategorizedEntity(code);
      const group = homeGroup(entity, pkoCodes, aliases);
      totals.set(group, (totals.get(group) ?? 0) + amount);
    }
    return [...totals.entries()]
      .map(([key, total]) => ({ key, total }))
      .sort(
        (a, b) =>
          getSystemGroupingStyle(a.key).order -
          getSystemGroupingStyle(b.key).order,
      );
  }, [aliases, entities, pkoCodes, spending]);

  const rects = useMemo(() => layoutGroups(groups, 100, 100, 0.35, 4), [groups]);

  if (error) {
    return (
      <p className="mt-10 text-sm text-gray-500" role="status">
        {error}
      </p>
    );
  }

  return (
    <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          UN System vs UN Secretariat
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          The UN System is the full set of UN organizations. The UN Secretariat,
          including peacekeeping operations, is one part of that System. Tile size
          shows spending.
        </p>
      </div>

      <div
        className="relative h-80 w-full overflow-hidden bg-gray-100"
        role="img"
        aria-label={`UN System spending by category in ${year}. UN Secretariat and peacekeeping operations are highlighted.`}
      >
        {rects.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Loading UN System categories…
          </div>
        )}
        {rects.map((rect) => {
          const styles = getSystemGroupingStyle(rect.key);
          const inSecretariat = SECRETARIAT_GROUPS.has(rect.key);
          const href = inSecretariat ? "/secretariat" : "/system";
          const total =
            groups.find((group) => group.key === rect.key)?.total ?? 0;
          return (
            <Tooltip key={rect.key} delayDuration={50}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  aria-label={`${styles.label}. Opens ${inSecretariat ? "UN Secretariat" : "UN System"} financials.`}
                  className={cn(
                    "absolute overflow-hidden text-left transition-[filter] hover:brightness-95",
                    inSecretariat ? "text-white" : "bg-gray-200 text-gray-800",
                  )}
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    backgroundColor: inSecretariat
                      ? SECRETARIAT_FILL
                      : undefined,
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.9)",
                  }}
                >
                  <div className="h-full p-1.5 sm:p-2">
                    <div className="text-[10px] leading-tight font-semibold sm:text-xs">
                      {styles.label}
                    </div>
                    {rect.height > 12 && (
                      <div className="mt-0.5 text-[10px] leading-tight opacity-80">
                        {formatBudget(total)}
                      </div>
                    )}
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={6}
                className="border border-slate-200 bg-white text-slate-800 shadow-lg"
              >
                <p className="text-sm font-semibold">{styles.label}</p>
                <p className="text-xs text-slate-600">{formatBudget(total)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
