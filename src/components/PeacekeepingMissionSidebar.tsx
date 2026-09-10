"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
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
  items: Record<CostClassKey, CostItem[]> | null;
  source?: BudgetNodeSource;
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
  label, amount, lines, maximum,
}: {
  label: string;
  amount: number | null;
  lines: CostItem[];
  maximum: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowClass = "group grid min-h-11 w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_4rem_5.5rem] items-center gap-x-2 rounded-sm px-1 py-1 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue sm:grid-cols-[2rem_minmax(0,1fr)_5rem_6rem] sm:gap-x-3";
  const bar = (value: number | null) => (
    <span aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-sm bg-gray-100">
      <span className="absolute inset-y-0 start-0 rounded-sm bg-un-blue" style={{ width: `${maximum > 0 ? Math.min(100, Math.max(0, value ?? 0) / maximum * 100) : 0}%` }} />
    </span>
  );
  const content = (
    <>
      {lines.length > 0 ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground group-hover:bg-muted group-hover:text-foreground">
          <ChevronRight aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </span>
      ) : <span aria-hidden="true" className="size-8" />}
      <span className="font-medium text-gray-900">{label}</span>
      {bar(amount)}
      <span className="justify-self-end whitespace-nowrap text-gray-900 tabular-nums">{amount === null ? "—" : formatBudget(amount)}</span>
    </>
  );
  return (
    <li>
      {lines.length > 0 ? (
        <button type="button" className={rowClass} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{content}</button>
      ) : <div className={rowClass}>{content}</div>}
      {expanded && lines.length > 0 && (
        <ul className="ps-3">
          {lines.map((line, index) => (
            <li key={`${line.label}-${index}`} className={rowClass}>
              <span aria-hidden="true" className="size-8" />
              <span className="text-gray-600">{line.label}</span>
              {bar(line.amount)}
              <span className="justify-self-end whitespace-nowrap text-gray-900 tabular-nums">{formatBudget(line.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function PeacekeepingMissionSidebar({
  code,
  name,
  locationLabel,
  fiscalYear,
  total,
  classes,
  items,
  source,
  onClose,
}: PeacekeepingMissionSidebarProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const focusTrapRef = useFocusTrap(true);
  const years = useYearRanges().budgetPko.years;
  const [trend, setTrend] = useState<FinancingInstrumentDataPoint[] | null>(
    null,
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = "";
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

  const classRows = COST_CLASS_KEYS.flatMap((key) => {
    const amount = classes?.[key] ?? null;
    const lines = items?.[key] ?? [];
    if (amount === null && lines.length === 0) return [];
    return [{ key, amount, lines }];
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
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-200 sm:w-[32rem] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 id={titleId} className="text-2xl font-bold text-gray-900">
              {code}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {locationLabel ? `${locationLabel} · ` : ""}{fiscalYear}
            </p>
          </div>
          <SidebarControls
            shareHash={`pko-mission=${encodeURIComponent(code)}`}
            onClose={close}
            closeLabel="Close mission details"
          />
        </header>

        <div className="space-y-8 px-6 py-6">
          <section>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              {name}
            </p>
            {total !== null ? (
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {formatBudget(total)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                No published expenditure for {fiscalYear}.
              </p>
            )}
          </section>

          {classRows.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
                Breakdown
              </h3>
              <ul className="mt-3 space-y-1">
                {classRows.map(({ key, amount, lines }) => (
                  <CostClassBreakdownRow
                    key={`${code}-${fiscalYear}-${key}`}
                    label={COST_CLASS_LABELS[key] ?? key}
                    amount={amount}
                    lines={lines}
                    maximum={Math.max(0, ...classRows.flatMap((row) => [row.amount ?? 0, ...row.lines.map((line) => line.amount)]))}
                  />
                ))}
              </ul>
            </section>
          )}

          <SidebarStackedTrend
            heading="Trend by cost class"
            data={trend}
            series={COST_CLASS_TREND_SERIES}
          />

          {source?.url && source.symbol && (
            <section>
              <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
                Source
              </h3>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
              >
                {source.symbol}
                {source.pdfPage ? `, PDF page ${source.pdfPage}` : " PDF"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
