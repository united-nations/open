"use client";
import { TrustFundFlowBreakdown } from "@/components/TrustFundFlowBreakdown";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { SidebarControls } from "@/components/SidebarControls";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { useContributorSidebarYear } from "@/hooks/useContributorSidebarYear";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelSection,
  FinancialPanelHeading,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { FinancialBreakdownRow } from "@un-eosg/ui/components/financial-breakdown-row";
import type {
  BudgetNodeSource,
  TrustFundContributor,
  TrustFundContributorsData,
} from "@/types";

import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
} from "@/components/charts/FinancingInstrumentChart";
import { useYearRanges } from "@/lib/useYearRanges";
import { loadYearData } from "@/lib/data";

const currency = sharedFormatBudget;

export function TrustFundContributorSidebar({
  contributor: initialContributor,
  meta: initialMeta,
  onClose,
}: {
  contributor: TrustFundContributor;
  meta: TrustFundContributorsData["meta"];
  onClose: () => void;
}) {
  const selection = useContributorSidebarYear<TrustFundContributorsData>(
    "trust-fund-contributors",
    initialMeta.year,
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
  const years = useYearRanges().trustFundContributors.years;
  const yearKey = years.join(",");
  const [trendSources, setTrendSources] = useState<
    Record<string, BudgetNodeSource[]>
  >({});
  const [trend, setTrend] = useState<FinancingInstrumentDataPoint[] | null>(
    null,
  );
  const [trendIncomplete, setTrendIncomplete] = useState(false);
  useEffect(() => {
    let active = true;
    const sourcesByYear: Record<string, BudgetNodeSource[]> = {};
    Promise.all(
      yearKey
        .split(",")
        .filter(Boolean)
        .map(Number)
        .map(async (year) => {
          try {
            const file = await loadYearData<TrustFundContributorsData>(
              "trust-fund-contributors",
              year,
            );
            const match = file.contributors.find(
              (item) => item.name === contributor.name,
            );
            sourcesByYear[String(year)] =
              match?.destinations.flatMap(
                (fund) => fund.supportingSources ?? [],
              ) ?? [];
            return {
              year: String(year),
              ...(match ? { contributions: match.amount_usd } : {}),
            };
          } catch {
            return { year: String(year) };
          }
        }),
    ).then((points) => {
      if (!active) return;
      setTrendSources(sourcesByYear);
      setTrend(points);
      setTrendIncomplete(points.some((point) => !("contributions" in point)));
    });
    return () => {
      active = false;
    };
  }, [contributor.name, yearKey]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const groups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        entity_id: string | null;
        entity_name: string;
        amount: number;
        funds: TrustFundContributor["destinations"];
      }
    >();
    for (const destination of contributor.destinations) {
      const key = destination.entity_id ?? "unresolved";
      const current = grouped.get(key) ?? {
        entity_id: destination.entity_id,
        entity_name: destination.entity_name ?? "Unmapped Trust Funds",
        amount: 0,
        funds: [],
      };
      current.amount += destination.amount_usd;
      current.funds.push(destination);
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => b.amount - a.amount);
  }, [contributor]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-300 ${visible && !closing ? "opacity-100" : "opacity-0"}`}
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-fund-contributor-title"
        className={`h-full w-full bg-white shadow-2xl transition-transform duration-300 sm:w-[32rem] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <FinancialDetailPanel
          title={contributor.name}
          titleId="trust-fund-contributor-title"
          subtitle={`Contributions and transfers · ${selection.year}`}
          yearSelectorPlacement="header"
          yearSelector={{
            years,
            selected: selection.year,
            onChange: selection.setYear,
            label: "Select year",
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
              shareHash={`trust-fund-contributor=${encodeURIComponent(contributor.name)}`}
              onClose={close}
              closeLabel="Close sidebar"
            />
          }
          total={
            ready
              ? {
                  label: "Net contributions and transfers",
                  value: (
                    <Tooltip
                      interactive
                      width={380}
                      content={
                        <SourceReferenceLinks
                          references={contributor.destinations.flatMap(
                            (fund) => fund.supportingSources ?? [],
                          )}
                        />
                      }
                    >
                      <span tabIndex={0}>
                        {currency(contributor.amount_usd)}
                      </span>
                    </Tooltip>
                  ),
                }
              : undefined
          }
          className="bg-white sm:w-full"
        >
          {ready && (
            <>
              {contributor.negative_amount_usd < 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  Gross positive rows{" "}
                  {currency(contributor.positive_amount_usd)}; refunds/transfers{" "}
                  {currency(contributor.negative_amount_usd)}.
                </p>
              )}
              <TrustFundFlowBreakdown flows={contributor.flows ?? []} />
              <FinancialPanelSection heading="Contributions and transfers over time">
                {trend === null ? (
                  <p role="status" className="text-sm text-gray-500">
                    Loading trend…
                  </p>
                ) : (
                  <FinancingInstrumentChart
                    tooltipSources={(year, visibleKeys) =>
                      visibleKeys.includes("contributions")
                        ? (trendSources[year] ?? [])
                        : []
                    }
                    variant="bar"
                    compact
                    showLegend={false}
                    allowNegative
                    data={trend}
                    series={[
                      {
                        key: "contributions",
                        label: "Net contributions and transfers",
                        color: "var(--color-un-blue)",
                      },
                    ]}
                  />
                )}
                {trendIncomplete && (
                  <p className="mt-2 text-sm text-gray-500">
                    Years without a reported contributor amount appear as gaps.
                  </p>
                )}
              </FinancialPanelSection>
              <FinancialPanelSection heading="Offices and trust funds">
                <ul className="space-y-1">
                  {groups.map((group) => {
                    const key = group.entity_id ?? "unresolved";
                    const maximum = Math.max(
                      0,
                      ...groups.flatMap((item) => [
                        item.amount,
                        ...item.funds.map((fund) => fund.amount_usd),
                      ]),
                    );
                    const bar = (amount: number) => (
                      <FinancialPanelBar
                        percent={maximum > 0 ? (amount / maximum) * 100 : 0}
                        color="var(--color-un-blue)"
                      />
                    );
                    return (
                      <FinancialBreakdownRow
                        interactiveTooltip
                        key={key}
                        label={group.entity_name}
                        value={currency(group.amount)}
                        bar={bar(group.amount)}
                        tooltip={
                          <div>
                            <p className="font-medium">{group.entity_name}</p>
                            <p>
                              Contributions and transfers:{" "}
                              {currency(group.amount)}
                            </p>
                            <SourceReferenceLinks
                              references={group.funds.flatMap(
                                (fund) => fund.supportingSources ?? [],
                              )}
                            />
                          </div>
                        }
                        expanded={expanded.has(key)}
                        onToggle={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                      >
                        <ul className="mt-1 space-y-1">
                          {[...group.funds]
                            .sort((a, b) => b.amount_usd - a.amount_usd)
                            .map((fund) => (
                              <FinancialBreakdownRow
                                interactiveTooltip
                                key={fund.fund_code}
                                label={`${fund.fund_code} · ${fund.fund_name}`}
                                value={currency(fund.amount_usd)}
                                bar={bar(fund.amount_usd)}
                                depth={1}
                                tooltip={
                                  <div>
                                    <p className="font-medium">
                                      {fund.fund_code} · {fund.fund_name}
                                    </p>
                                    <p>{group.entity_name}</p>
                                    <p>
                                      Contributions and transfers:{" "}
                                      {currency(fund.amount_usd)}
                                    </p>
                                    <SourceReferenceLinks
                                      references={fund.supportingSources ?? []}
                                    />
                                  </div>
                                }
                              />
                            ))}
                          {group.entity_id && (
                            <li className="ps-3 pt-1">
                              <button
                                type="button"
                                className="text-sm text-un-blue hover:underline"
                                onClick={() =>
                                  navigateToSidebar(
                                    "trust-fund-entity",
                                    group.entity_id!,
                                  )
                                }
                              >
                                Open office details
                              </button>
                            </li>
                          )}
                        </ul>
                      </FinancialBreakdownRow>
                    );
                  })}
                </ul>
              </FinancialPanelSection>
              <details
                key={`${contributor.name}-${meta.year}`}
                className="group/sources mt-4"
              >
                <summary className="mb-3 flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                  <FinancialPanelHeading subheading>
                    Source references
                  </FinancialPanelHeading>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3 group-open/sources:rotate-90"
                  />
                </summary>
                <p className="text-sm leading-relaxed text-gray-700">
                  {meta.method_note} {meta.mapping_note}
                </p>
                <SourceReferenceList
                  references={
                    contributor.destinations.flatMap(
                      (destination) => destination.supportingSources ?? [],
                    ).length
                      ? contributor.destinations.flatMap(
                          (destination) => destination.supportingSources ?? [],
                        )
                      : [
                          {
                            ...meta.source,
                            rowLabel: "Contributions and transfers",
                            columnHeader: String(meta.year),
                          },
                        ]
                  }
                />
              </details>
            </>
          )}
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
