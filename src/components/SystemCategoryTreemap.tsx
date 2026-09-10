"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { loadStaticData, loadYearData } from "@/lib/data";
import {
  createUncategorizedEntity,
  formatBudget,
  normalizeEntityForDisplay,
} from "@/lib/entities";
import { layoutGroups } from "@/lib/treemapLayout";
import { useYearRanges } from "@/lib/useYearRanges";
import { cn } from "@/lib/utils";
import type { BudgetEntry, Entity } from "@/types";

export function SystemCategoryTreemap() {
  const year = useYearRanges().entitySpending.default;
  const [entities, setEntities] = useState<Entity[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadStaticData<Entity[]>("entities.json"),
      loadYearData<BudgetEntry[]>("entity-spending", year),
    ])
      .then(([entityList, spendingRows]) => {
        if (!active) return;
        setEntities(entityList);
        setSpending(
          spendingRows.reduce<Record<string, number>>((acc, row) => {
            acc[row.entity] = row.amount;
            return acc;
          }, {}),
        );
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
    const totals = new Map<string, number>();
    for (const [code, amount] of Object.entries(spending)) {
      if (!code || amount <= 0) continue;
      const entity = metadata.get(code) || createUncategorizedEntity(code);
      const group = entity.system_grouping;
      totals.set(group, (totals.get(group) ?? 0) + amount);
    }
    return [...totals.entries()]
      .map(([key, total]) => ({ key, total }))
      .sort(
        (a, b) =>
          getSystemGroupingStyle(a.key).order -
          getSystemGroupingStyle(b.key).order,
      );
  }, [entities, spending]);

  const rects = useMemo(() => layoutGroups(groups, 100, 100, 0.35, 4), [groups]);

  if (error) {
    return (
      <p className="mt-10 text-sm text-gray-500" role="status">
        {error}
      </p>
    );
  }

  return (
    <section className="grid gap-8 rounded-lg border border-gray-200 bg-white p-6 md:col-span-2 md:grid-cols-2 md:items-center">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900">
          UN System organizations
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          Explore UN System organizations by category. Tile size shows spending.
        </p>
      </div>

      <div
        className="relative h-72 w-full overflow-hidden bg-gray-100 md:justify-self-end md:w-[90%]"
        role="img"
        aria-label={`UN System spending by category in ${year}. Tile colors identify the organization categories.`}
      >
        {rects.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Loading UN System categories…
          </div>
        )}
        {rects.map((rect) => {
          const styles = getSystemGroupingStyle(rect.key);
          const total =
            groups.find((group) => group.key === rect.key)?.total ?? 0;
          return (
            <Tooltip key={rect.key} delayDuration={50}>
              <TooltipTrigger asChild>
                <Link
                  href="/system/organizations"
                  aria-label={`${styles.label}. Opens UN System organizations.`}
                  className={cn(
                    "absolute overflow-hidden text-left transition-[filter] hover:brightness-95",
                    styles.bgColor,
                    styles.textColor,
                  )}
                  style={{
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
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
    </section>
  );
}
