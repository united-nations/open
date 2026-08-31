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

export interface PeacekeepingMissionSidebarProps {
  code: string;
  name: string;
  kindLabel: string;
  locationLabel: string | null;
  fiscalYear: string;
  total: number | null;
  classes: Record<CostClassKey, number | null> | null;
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
    const amount = classes?.[key];
    if (amount === null || amount === undefined) return [];
    return [{ key, amount }];
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
              <dl className="mt-3 divide-y divide-gray-100">
                {classRows.map(({ key, amount }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 py-2 text-sm"
                  >
                    <dt className="flex items-center gap-2 text-gray-600">
                      <span
                        className="size-2.5 shrink-0"
                        style={{
                          backgroundColor:
                            COST_CLASS_BAND_COLORS[key]?.bg ?? "#6b7280",
                        }}
                        aria-hidden="true"
                      />
                      {COST_CLASS_LABELS[key] ?? key}
                    </dt>
                    <dd className="font-semibold text-gray-900">
                      {formatBudget(amount)}
                    </dd>
                  </div>
                ))}
              </dl>
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
