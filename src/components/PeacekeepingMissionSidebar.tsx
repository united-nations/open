"use client";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelHeading,
  FinancialPanelSection,
} from "@un-eosg/ui/components/financial-panel-parts";
import { FinancialBreakdownRow } from "@un-eosg/ui/components/financial-breakdown-row";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { SidebarControls } from "@/components/SidebarControls";
import {
  SidebarStackedTrend,
  type FinancingInstrumentDataPoint,
  type FinancingSeries,
} from "@/components/SidebarStackedTrend";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  COST_CLASS_BAND_COLORS,
  COST_CLASS_KEYS,
  COST_CLASS_LABELS,
  COST_CLASS_SHORT,
  fiscalYearLabel,
  type CostClassKey,
} from "@/lib/budgetGroupings";
import { collectBudgetNodeSources } from "@/lib/budgetSourceCollection";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@/lib/entities";
import { useYearRanges } from "@/lib/useYearRanges";
import type { BudgetData, BudgetNodeSource } from "@/types";

const COST_CLASS_TREND_SERIES: FinancingSeries[] = COST_CLASS_KEYS.map(
  (key) => ({
    key,
    label: COST_CLASS_SHORT[key] ?? COST_CLASS_LABELS[key] ?? key,
    color: COST_CLASS_BAND_COLORS[key]?.bg ?? "#6b7280",
  }),
);

interface CostItem {
  references?: BudgetNodeSource[];
  label: string;
  amount: number;
}

export interface PeacekeepingMissionSidebarProps {
  code: string;
  name: string;
  locationLabel: string | null;
  fiscalYear: string;
  total: number | null;
  classes: Record<CostClassKey, number | null> | null;
  classReferences?: Partial<Record<CostClassKey, BudgetNodeSource[]>>;
  items: Record<CostClassKey, CostItem[]> | null;
  source?: BudgetNodeSource;
  references?: BudgetNodeSource[];
  onClose: () => void;
}

function emptyClasses(): Record<CostClassKey, number> {
  return {
    military_police_personnel: 0,
    civilian_personnel: 0,
    operational_costs: 0,
  };
}

function CostClassBreakdownRow({
  label,
  amount,
  lines,
  maximum,
  color,
  references,
}: {
  references: BudgetNodeSource[];
  label: string;
  amount: number | null;
  lines: CostItem[];
  maximum: number;
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const bar = (value: number | null) => (
    <span
      aria-hidden="true"
      className="relative h-1.5 overflow-hidden rounded-sm bg-gray-100"
    >
      <span
        className="absolute inset-y-0 start-0 rounded-sm bg-un-blue"
        style={{
          backgroundColor: color,
          width: `${maximum > 0 ? Math.min(100, (Math.max(0, value ?? 0) / maximum) * 100) : 0}%`,
        }}
      />
    </span>
  );
  const tooltip = (
    title: string,
    value: number | null,
    kind: string,
    sources: BudgetNodeSource[],
  ) => (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{kind}</p>
      <p className="text-sm font-medium">{title}</p>
      <p>Expenditure: {value === null ? "Unavailable" : formatBudget(value)}</p>
      <SourceReferenceLinks references={sources} />
    </div>
  );
  return (
    <FinancialBreakdownRow
      interactiveTooltip
      label={label}
      value={amount === null ? "—" : formatBudget(amount)}
      bar={bar(amount)}
      tooltip={tooltip(label, amount, "Budget group", references)}
      expanded={expanded}
      onToggle={lines.length ? () => setExpanded(!expanded) : undefined}
    >
      <ul className="mt-1 space-y-1">
        {lines.map((line, index) => (
          <FinancialBreakdownRow
            interactiveTooltip
            key={`${line.label}-${index}`}
            label={line.label}
            value={formatBudget(line.amount)}
            bar={bar(line.amount)}
            tooltip={tooltip(
              line.label,
              line.amount,
              `Class · ${label}`,
              line.references ?? [],
            )}
            depth={1}
          />
        ))}
      </ul>
    </FinancialBreakdownRow>
  );
}

export function PeacekeepingMissionSidebar({
  code,
  name,
  locationLabel,
  fiscalYear,
  total,
  classes,
  classReferences,
  items,
  source,
  references,
  onClose,
}: PeacekeepingMissionSidebarProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const focusTrapRef = useFocusTrap(true);
  const years = useYearRanges().budgetPko.years;
  const [trendSources, setTrendSources] = useState<
    Record<string, Partial<Record<CostClassKey, BudgetNodeSource[]>>>
  >({});
  const [trend, setTrend] = useState<FinancingInstrumentDataPoint[] | null>(
    null,
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    const previousOverflow = document.documentElement.style.overflow;
    const previousGutter = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.scrollbarGutter = "auto";
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousGutter;
    };
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((trendYear) =>
        loadYearData<BudgetData>("budget-pko", trendYear)
          .then((data) => ({ year: trendYear, data }))
          .catch(() => ({ year: trendYear, data: null })),
      ),
    ).then((rows) => {
      if (!active) return;
      setTrendSources(
        Object.fromEntries(
          rows.map(({ year: trendYear, data }) => [
            fiscalYearLabel(trendYear),
            Object.fromEntries(
              COST_CLASS_KEYS.map((key) => [
                key,
                data?.nodes
                  .filter(
                    (node) =>
                      node.tier === "class" &&
                      node.mission === code &&
                      node.costClass === key,
                  )
                  .flatMap((node) => collectBudgetNodeSources(node)) ?? [],
              ]),
            ),
          ]),
        ),
      );
      setTrend(
        rows.map(({ year: trendYear, data }) => {
          const amounts = emptyClasses();
          if (data) {
            const classNodes = data.nodes.filter(
              (node) => node.tier === "class" && node.mission === code,
            );
            for (const node of classNodes) {
              const key = node.costClass as CostClassKey;
              if (key in amounts) amounts[key] += node.amount;
            }
          }
          return {
            year: fiscalYearLabel(trendYear),
            ...amounts,
          };
        }),
      );
    });
    return () => {
      active = false;
    };
  }, [code, years]);

  const classRows = COST_CLASS_KEYS.map((key) => {
    const amount = classes?.[key] ?? null;
    const lines = items?.[key] ?? [];
    return { key, amount, lines };
  });
  const titleId = "peacekeeping-mission-sidebar-title";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-200 ${visible && !closing ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`h-full w-full bg-white shadow-2xl transition-transform duration-200 sm:w-[32rem] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <FinancialDetailPanel
          title={code}
          titleId={titleId}
          subtitle={
            <>
              {name}
              <br />
              {locationLabel ? `${locationLabel} · ` : ""}
              {fiscalYear}
            </>
          }
          controls={
            <SidebarControls
              shareHash={`pko-mission=${encodeURIComponent(code)}`}
              onClose={close}
              closeLabel="Close mission details"
            />
          }
          total={
            total !== null
              ? {
                  label: "Total expenditure",
                  value: (
                    <Tooltip
                      interactive
                      width={380}
                      content={
                        <SourceReferenceLinks
                          references={
                            references?.length
                              ? references
                              : source
                                ? [source]
                                : []
                          }
                        />
                      }
                    >
                      <span tabIndex={0}>{formatBudget(total)}</span>
                    </Tooltip>
                  ),
                }
              : undefined
          }
          notice={
            total === null
              ? {
                  tone: "empty",
                  description: `No published expenditure for ${fiscalYear}.`,
                }
              : undefined
          }
          className="bg-white sm:w-full"
        >
          {classRows.length > 0 && (
            <FinancialPanelSection heading="Expenditure by budget group and class">
              <ul className="mt-3 space-y-1">
                {classRows.map(({ key, amount, lines }) => (
                  <CostClassBreakdownRow
                    key={`${code}-${fiscalYear}-${key}`}
                    label={COST_CLASS_LABELS[key] ?? key}
                    amount={amount}
                    references={classReferences?.[key] ?? []}
                    color={
                      COST_CLASS_BAND_COLORS[key]?.bg ?? "var(--color-un-blue)"
                    }
                    lines={lines}
                    maximum={Math.max(
                      0,
                      ...classRows.flatMap((row) => [
                        row.amount ?? 0,
                        ...row.lines.map((line) => line.amount),
                      ]),
                    )}
                  />
                ))}
              </ul>
              <div className="mt-4">
                <SidebarStackedTrend
                  tooltipSources={(year, visibleKeys) =>
                    visibleKeys.flatMap(
                      (key) => trendSources[year]?.[key as CostClassKey] ?? [],
                    )
                  }
                  showLegend={false}
                  data={trend}
                  series={COST_CLASS_TREND_SERIES}
                />
              </div>
            </FinancialPanelSection>
          )}

          {Boolean(references?.length || (source?.url && source.symbol)) && (
            <details
              key={`${code}-${fiscalYear}`}
              className="group/sources mt-4"
            >
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                <FinancialPanelHeading subheading>
                  Source references
                </FinancialPanelHeading>
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 transition-transform group-open/sources:rotate-90"
                />
              </summary>
              <div className="mt-3">
                <SourceReferenceList
                  references={
                    references?.length
                      ? references
                      : source
                        ? [
                            {
                              ...source,
                              budgetItem: name,
                              label: "Total expenditure",
                            },
                          ]
                        : []
                  }
                />
              </div>
            </details>
          )}
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
