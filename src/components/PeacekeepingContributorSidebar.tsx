"use client";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

import { ChevronRight, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelSection,
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SidebarControls } from "@/components/SidebarControls";
import { useContributorSidebarYear } from "@/hooks/useContributorSidebarYear";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type {
  PeacekeepingContributor,
  PeacekeepingContributorsData,
} from "@/types";

import { useYearRanges } from "@/lib/useYearRanges";

const currency = sharedFormatBudget;

export function PeacekeepingContributorSidebar({
  contributor: initialContributor,
  meta: initialMeta,
  onClose,
}: {
  contributor: PeacekeepingContributor;
  meta: PeacekeepingContributorsData["meta"];
  onClose: () => void;
}) {
  const years = useYearRanges().peacekeepingContributors.years;
  const selection = useContributorSidebarYear<PeacekeepingContributorsData>(
    "peacekeeping-contributors",
    initialMeta.cycle_year,
  );
  const currentContributor = selection.isInitialYear
    ? initialContributor
    : selection.data?.contributors.find(
        (item) => item.name === initialContributor.name,
      );
  const contributor = currentContributor ?? initialContributor;
  const meta = selection.isInitialYear
    ? initialMeta
    : (selection.data?.meta ?? initialMeta);
  const ready = !selection.loading && !selection.error && !!currentContributor;
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
    const previousOverflow = document.documentElement.style.overflow;
    const previousGutter = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.scrollbarGutter = "auto";
    return () => {
      document.removeEventListener("keydown", escape);
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousGutter;
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
        className={`h-full w-full bg-white shadow-2xl transition-transform duration-300 sm:w-[32rem] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <FinancialDetailPanel
          title={contributor.name}
          titleId="peacekeeping-contributor-title"
          subtitle={`Peacekeeping assessments · ${selection.year}/${String(selection.year + 1).slice(-2)}`}
          yearSelectorPlacement="header"
          yearSelector={{
            years,
            selected: selection.year,
            onChange: selection.setYear,
            label: "Select assessment cycle",
            pending: selection.loading,
            pendingLabel: "Loading…",
          }}
          busy={selection.loading}
          notice={
            !ready
              ? {
                  tone: selection.error ? "error" : "empty",
                  description:
                    selection.error ??
                    (selection.loading
                      ? "Loading contributor details…"
                      : "No contributor data is published for this year."),
                }
              : undefined
          }
          controls={
            <SidebarControls
              shareHash={`peacekeeping-contributor=${encodeURIComponent(contributor.name)}`}
              onClose={close}
              closeLabel="Close sidebar"
            />
          }
          total={
            ready
              ? {
                  label: "Net assessed amount",
                  value: currency(contributor.net_assessment),
                }
              : undefined
          }
          className="bg-white sm:w-full"
        >
          {ready && (
            <>
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

              <FinancialPanelSection heading="Mission assessments">
                <div className="space-y-3">
                  {missions.map((mission) => (
                    <Tooltip
                      key={mission.code}
                      width={380}
                      content={
                        <div className="space-y-2">
                          <p className="font-medium">{mission.name}</p>
                          <p>
                            Net assessment: {currency(mission.net_assessment)}
                          </p>
                          <p>
                            Gross assessment:{" "}
                            {currency(mission.gross_assessment)}
                          </p>
                        </div>
                      }
                    >
                      <div
                        tabIndex={0}
                        className="rounded-sm focus-visible:outline-2 focus-visible:outline-un-blue"
                      >
                        <FinancialPanelRankedRow
                          label={mission.code}
                          value={currency(mission.net_assessment)}
                        >
                          <FinancialPanelBar
                            percent={
                              largestMission > 0
                                ? (mission.net_assessment / largestMission) *
                                  100
                                : 0
                            }
                            color="var(--color-un-blue)"
                          />
                        </FinancialPanelRankedRow>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </FinancialPanelSection>

              <details
                key={`${contributor.name}-${meta.fiscal_year}`}
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
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-gray-700">
                    Assessment sections are added and credit sections are
                    subtracted. These are amounts assessed for the cycle, not
                    amounts paid or outstanding.
                  </p>
                  <ul className="space-y-2 text-sm">
                    {Array.from(
                      new Map(
                        missions.flatMap((mission) =>
                          (mission.source_statement_urls?.length
                            ? mission.source_statement_urls
                            : [mission.source_url]
                          ).map(
                            (url, index, sources) =>
                              [
                                url,
                                `${mission.source_symbol}${sources.length > 1 ? ` · statement ${index + 1}` : ""}`,
                              ] as const,
                          ),
                        ),
                      ).entries(),
                    ).map(([url, label]) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-un-blue hover:underline"
                        >
                          {label}
                          <ExternalLink className="size-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  {(rateExceptions.length > 0 || derivedRows.length > 0) && (
                    <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
                      <p className="font-semibold">Source-data exception</p>
                      {rateExceptions.map((exception) => (
                        <p
                          key={`${exception.symbol}-${exception.section}`}
                          className="mt-1"
                        >
                          {exception.symbol}, section {exception.section},
                          prints a peacekeeping rate of{" "}
                          {exception.printed_peacekeeping_rate}
                          %; the dollar amount implies{" "}
                          {exception.implied_rate_from_gross_amount}%. The
                          printed dollar amount is used.
                        </p>
                      ))}
                      {derivedRows.map((exception) => (
                        <p
                          key={`${exception.symbol}-${exception.section}`}
                          className="mt-1"
                        >
                          {exception.symbol}, section {exception.section}, omits
                          this Member State row. Its{" "}
                          {currency(exception.row.net)} net amount is the
                          residual required to match the printed section total.
                        </p>
                      ))}
                    </div>
                  )}

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
              </details>
            </>
          )}
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
