"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { formatBudget } from "@/lib/entities";
import type {
  SecretariatFundingSource,
  SecretariatOverviewEntity,
} from "@/types";

const FUNDING_LABELS: Record<SecretariatFundingSource, string> = {
  regular_budget: "Regular budget",
  other_assessed: "Other assessed",
  extrabudgetary: "Extrabudgetary",
};

interface SecretariatEntitySidebarProps {
  entity: SecretariatOverviewEntity;
  year: number;
  groupLabel: string;
  selectedPriority: string | null;
  onClose: () => void;
}

function amountRows(
  entity: SecretariatOverviewEntity,
  key: "priority_area" | "funding_source",
) {
  const values = new Map<string, number>();
  for (const cell of entity.cells) {
    const label = cell[key];
    values.set(label, (values.get(label) ?? 0) + cell.amount);
  }
  return [...values.entries()].sort((a, b) => b[1] - a[1]);
}

export function SecretariatEntitySidebar({
  entity,
  year,
  groupLabel,
  selectedPriority,
  onClose,
}: SecretariatEntitySidebarProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const focusTrapRef = useFocusTrap(true);
  const priorities = useMemo(
    () => amountRows(entity, "priority_area"),
    [entity],
  );
  const funding = useMemo(() => amountRows(entity, "funding_source"), [entity]);
  const selectedAmount = selectedPriority
    ? (priorities.find(([label]) => label === selectedPriority)?.[1] ?? 0)
    : null;

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

  const titleId = "secretariat-entity-sidebar-title";

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
              {entity.code === "STA" ? "Staff Assessment" : entity.code}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {groupLabel} · {year}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close entity details"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-8 px-6 py-6">
          <section>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Total expenses
            </p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {formatBudget(entity.total)}
            </p>
            {selectedPriority && selectedAmount !== null && (
              <p className="mt-2 text-sm text-gray-600">
                {formatBudget(selectedAmount)} (
                {entity.total > 0
                  ? ((selectedAmount / entity.total) * 100).toFixed(1)
                  : "0.0"}
                %) was spent on {selectedPriority}.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Priority areas
            </h3>
            <div className="mt-3 space-y-3">
              {priorities.map(([label, amount]) => (
                <div key={label}>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-gray-700">{label}</span>
                    <span className="shrink-0 font-semibold text-gray-900">
                      {formatBudget(amount)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-un-blue"
                      style={{
                        width: `${Math.max(0, Math.min(100, (amount / entity.total) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Funding type
            </h3>
            <dl className="mt-3 divide-y divide-gray-100">
              {funding.map(([source, amount]) => (
                <div
                  key={source}
                  className="flex items-center justify-between gap-4 py-2 text-sm"
                >
                  <dt className="text-gray-600">
                    {FUNDING_LABELS[source as SecretariatFundingSource] ??
                      source}
                  </dt>
                  <dd className="font-semibold text-gray-900">
                    {formatBudget(amount)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="border-l-2 border-un-blue bg-sky-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
            Priority-area amounts retain the source allocation. The primary
            priority used for overview placement does not replace this
            breakdown.
          </p>
        </div>
      </aside>
    </div>
  );
}
