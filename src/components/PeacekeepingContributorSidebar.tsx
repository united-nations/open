"use client";

import { ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type {
  PeacekeepingContributor,
  PeacekeepingContributorsData,
} from "@/types";

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PeacekeepingContributorSidebar({
  contributor,
  meta,
  onClose,
}: {
  contributor: PeacekeepingContributor;
  meta: PeacekeepingContributorsData["meta"];
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const focusTrapRef = useFocusTrap(true);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", escape);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.documentElement.style.overflow = "";
    };
  }, [close]);

  const missions = useMemo(
    () =>
      [...contributor.missions].sort(
        (a, b) =>
          b.net_assessment - a.net_assessment || a.code.localeCompare(b.code),
      ),
    [contributor],
  );
  const largestMission = Math.max(
    ...missions.map((mission) => mission.net_assessment),
    0,
  );
  const rateExceptions = meta.verification.source_rate_anomalies.filter(
    (exception) => exception.contributor === contributor.name,
  );
  const derivedRows =
    meta.verification.rows_derived_from_printed_totals.flatMap((exception) =>
      exception.rows
        .filter((row) => row.contributor === contributor.name)
        .map((row) => ({ ...exception, row })),
    );

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-300 ${visible && !closing ? "opacity-100" : "opacity-0"}`}
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="peacekeeping-contributor-title"
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 sm:w-2/3 md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-300 bg-white px-6 py-5 sm:px-8">
          <div>
            <h2
              id="peacekeeping-contributor-title"
              className="text-xl leading-tight font-bold text-gray-900 sm:text-2xl"
            >
              {contributor.name}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Peacekeeping assessments · {meta.fiscal_year}
            </p>
          </div>
          <div className="flex gap-2">
            <ShareButton
              hash={`peacekeeping-contributor=${encodeURIComponent(contributor.name)}`}
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </header>

        <div className="space-y-6 px-6 py-5 sm:px-8">
          <div>
            <p className="text-sm tracking-wide text-gray-600 uppercase">
              Net assessed amount
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {currency(contributor.net_assessment)}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-gray-600">Gross assessment</dt>
              <dd className="text-right text-gray-900">
                {currency(contributor.gross_assessment)}
              </dd>
              <dt className="text-gray-600">Tax equalization adjustment</dt>
              <dd className="text-right text-gray-900">
                {currency(contributor.tax_equalization_adjustment)}
              </dd>
            </dl>
          </div>

          <div>
            <h3 className="mb-3 text-lg tracking-wider text-gray-900 uppercase">
              Mission assessments
            </h3>
            <div className="space-y-3">
              {missions.map((mission) => (
                <div key={mission.code}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {mission.code}
                      </p>
                      <p
                        className="truncate text-xs text-gray-500"
                        title={mission.name}
                      >
                        {mission.name}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm text-gray-900">
                      {currency(mission.net_assessment)}
                      {(
                        mission.source_statement_urls ?? [mission.source_url]
                      ).map((url, index, sources) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${mission.source_symbol} source${sources.length > 1 ? ` statement ${index + 1} of ${sources.length}` : ""} for ${mission.code}`}
                          title={`${mission.source_symbol}${sources.length > 1 ? ` · statement ${index + 1} of ${sources.length}` : ""}`}
                          className="inline-flex text-un-blue hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-un-blue"
                      style={{
                        width: `${largestMission > 0 ? Math.max(0, (mission.net_assessment / largestMission) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(rateExceptions.length > 0 || derivedRows.length > 0) && (
            <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Source-data exception</p>
              {rateExceptions.map((exception) => (
                <p
                  key={`${exception.symbol}-${exception.section}`}
                  className="mt-1"
                >
                  {exception.symbol}, section {exception.section}, prints a
                  peacekeeping rate of {exception.printed_peacekeeping_rate}%;
                  the dollar amount implies{" "}
                  {exception.implied_rate_from_gross_amount}%. The printed
                  dollar amount is used.
                </p>
              ))}
              {derivedRows.map((exception) => (
                <p
                  key={`${exception.symbol}-${exception.section}`}
                  className="mt-1"
                >
                  {exception.symbol}, section {exception.section}, omits this
                  Member State row. Its {currency(exception.row.net)} net amount
                  is the residual required to match the printed section total.
                </p>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-lg tracking-wider text-gray-900 uppercase">
              Method and source
            </h3>
            <p className="text-sm leading-relaxed text-gray-700">
              Assessment sections are added and credit sections are subtracted.
              These are amounts assessed for the cycle, not amounts paid or
              outstanding. Open any mission amount above for its source
              circular.
            </p>
            <a
              href={meta.source_page}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
            >
              Committee on Contributions source index
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
