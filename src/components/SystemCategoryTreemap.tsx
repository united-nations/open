"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import { loadStaticData, loadYearData } from "@/lib/data";
import {
  createUncategorizedEntity,
  normalizeEntityForDisplay,
} from "@/lib/entities";
import { layoutGroups } from "@/lib/treemapLayout";
import { useYearRanges } from "@/lib/useYearRanges";
import { cn } from "@/lib/utils";
import type { BudgetEntry, Entity } from "@/types";

export function SystemCategoryTreemap({
  systemCard,
  secretariatCard,
}: {
  systemCard: ReactNode;
  secretariatCard: ReactNode;
}) {
  const overviewRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const secretariatRef = useRef<HTMLAnchorElement>(null);
  const systemCardRef = useRef<HTMLDivElement>(null);
  const secretariatCardRef = useRef<HTMLDivElement>(null);
  const [connectors, setConnectors] = useState<{ system: string; secretariat: string; secretariatOutline: string } | null>(null);
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
      .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  }, [entities, spending]);

  const rects = useMemo(() => {
    const secretariat = groups.find(group => group.key === "UN Secretariat");
    if (!secretariat) return layoutGroups(groups, 100, 100, 0, 4);
    const total = groups.reduce((sum, group) => sum + group.total, 0);
    const secretariatHeight = secretariat.total / total * 100;
    const otherHeight = 100 - secretariatHeight;
    return [
      ...layoutGroups(groups.filter(group => group.key !== "UN Secretariat"), 100, otherHeight, 0, 4),
      { key: secretariat.key, x: 0, y: otherHeight, width: 100, height: secretariatHeight },
    ];
  }, [groups]);

  useEffect(() => {
    const overview = overviewRef.current;
    const frame = frameRef.current;
    const systemCardElement = systemCardRef.current;
    const secretariatCardElement = secretariatCardRef.current;
    if (!overview || !frame || !systemCardElement || !secretariatCardElement) return;
    const update = () => {
      const origin = overview.getBoundingClientRect();
      const whole = frame.getBoundingClientRect();
      const system = systemCardElement.getBoundingClientRect();
      const secretariat = secretariatCardElement.getBoundingClientRect();
      const tile = secretariatRef.current?.getBoundingClientRect();
      if (system.right >= whole.left || !tile) {
        setConnectors(null);
        return;
      }
      const path = (x: number, y: number, target: DOMRect, outline = false) => {
        // Join the middle of the 1px card border; keep the white outline outside it.
        const endX = target.right - origin.left - (outline ? 0 : 0.5);
        // Meet the side of the card horizontally whenever the source is within
        // its height; otherwise use a single straight segment to its nearest edge.
        const endY = Math.max(target.top + 16 - origin.top,
          Math.min(y, target.bottom - 16 - origin.top));
        return `M ${x} ${y} L ${endX} ${endY}`;
      };
      const secretariatY = tile.top + tile.height / 2;
      const connectorInset = whole.bottom - secretariatY;
      setConnectors({
        system: path(whole.left + 0.5 - origin.left, whole.top + connectorInset - origin.top, system),
        secretariat: path(tile.left - origin.left, secretariatY - origin.top, secretariat),
        secretariatOutline: path(tile.left - 2 - origin.left, secretariatY - origin.top, secretariat, true),
      });
    };
    const observer = new ResizeObserver(update);
    [overview, frame, systemCardElement, secretariatCardElement].forEach(element => observer.observe(element));
    const animation = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [rects]);

  return (
    <div ref={overviewRef} className="relative mt-10 grid items-center gap-8 md:grid-cols-[minmax(0,1.15fr)_5rem_minmax(0,0.85fr)] md:gap-0">
      <div className="relative space-y-6 md:col-start-1 md:row-start-1">
        <div ref={systemCardRef}>{systemCard}</div>
        <div ref={secretariatCardRef}>{secretariatCard}</div>
      </div>
      <figure className="min-w-0 md:col-start-3 md:row-start-1">
        <div ref={frameRef} className="rounded-lg border border-gray-700 bg-white p-1">
          <div
            className="relative h-90 w-full overflow-hidden rounded-sm bg-white"
            role="group"
            aria-label={`UN System spending by category in ${year}. Blue highlights the UN Secretariat within the System.`}
          >
            {error ? (
              <p className="flex h-full items-center justify-center p-4 text-sm text-gray-500" role="status">{error}</p>
            ) : rects.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading UN System categories…</div>
            ) : rects.map((rect) => {
              const styles = getSystemGroupingStyle(rect.key);
              const isSecretariat = rect.key === "UN Secretariat";
              return (
                <Link
                  key={rect.key}
                  ref={isSecretariat ? secretariatRef : undefined}
                  href={isSecretariat ? "/secretariat" : "/system/organizations"}
                  aria-label={`${styles.label}. Opens ${isSecretariat ? "UN Secretariat financials" : "UN System organizations"}.`}
                  className={cn(
                    "absolute overflow-hidden text-left transition-[filter] hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black",
                    isSecretariat ? "bg-un-blue text-white" : "bg-gray-300 text-gray-800",
                  )}
                  style={{
                    // Half of a 3px gap on each internal edge, with no outer inset.
                    left: `calc(${rect.x}% + ${rect.x > 0.001 ? 1.5 : 0}px)`,
                    top: `calc(${rect.y}% + ${rect.y > 0.001 ? 1.5 : 0}px)`,
                    width: `max(0px, calc(${rect.width}% - ${(rect.x > 0.001 ? 1.5 : 0) + (rect.x + rect.width < 99.999 ? 1.5 : 0)}px))`,
                    height: `max(0px, calc(${rect.height}% - ${(rect.y > 0.001 ? 1.5 : 0) + (rect.y + rect.height < 99.999 ? 1.5 : 0)}px))`,
                  }}
                >
                  <div className={cn(
                    "flex h-full overflow-hidden px-2",
                    rect.height < 12 ? "items-center" : "items-start py-2",
                  )}>
                    <div className="min-w-0 truncate text-sm leading-tight font-semibold">{styles.label}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <figcaption className="mt-2 text-xs leading-relaxed text-gray-600">
          Overview of the UN System and its categories of entities.
        </figcaption>
      </figure>
      {connectors && (
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block" fill="none">
          <path d={connectors.system} className="stroke-gray-700" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="round" />
          <path d={connectors.secretariatOutline} className="stroke-white" strokeWidth="5" strokeLinecap="butt" strokeLinejoin="round" />
          <path d={connectors.secretariat} className="stroke-un-blue" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
