"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
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
  kindLabel: string;
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

export function PeacekeepingMissionSidebar({
  code,
  name,
  kindLabel,
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
              {kindLabel}
              {locationLabel ? ` · ${locationLabel}` : ""} · {fiscalYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton hash={`pko-mission=${encodeURIComponent(code)}`} />
            <button
              type="button"
              onClick={close}
              aria-label="Close mission details"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              <X className="size-4" />
            </button>
          </div>
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
                Expenditure {fiscalYear} by cost class
              </h3>
              <div className="mt-3 space-y-5">
                {classRows.map(({ key, amount, lines }) => {
                  const classTotal = amount ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <span className="flex items-center gap-2 font-medium text-gray-900">
                          <span
                            className="size-2.5 shrink-0"
                            style={{
                              backgroundColor:
                                COST_CLASS_BAND_COLORS[key]?.bg ?? "#6b7280",
                            }}
                            aria-hidden="true"
                          />
                          {COST_CLASS_LABELS[key] ?? key}
                        </span>
                        <span className="shrink-0 font-semibold text-gray-900">
                          {amount === null ? "—" : formatBudget(amount)}
                        </span>
                      </div>
                      {lines.length > 0 && (
                        <ul className="mt-2 space-y-2">
                          {lines.map((line, index) => (
                            <li key={`${line.label}-${index}`}>
                              <div className="flex items-start justify-between gap-4 text-sm">
                                <span className="text-gray-600">
                                  {line.label}
                                </span>
                                <span className="shrink-0 tabular-nums text-gray-900">
                                  {formatBudget(line.amount)}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${
                                      classTotal > 0
                                        ? Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              (line.amount / classTotal) * 100,
                                            ),
                                          )
                                        : 0
                                    }%`,
                                    backgroundColor:
                                      COST_CLASS_BAND_COLORS[key]?.bg ??
                                      "#6b7280",
                                  }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
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
