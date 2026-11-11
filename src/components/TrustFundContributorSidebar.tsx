"use client";
import { TrustFundFlowBreakdown } from "@/components/TrustFundFlowBreakdown";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { SourceCalculation } from "@/components/SourceCalculation";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { SidebarControls } from "@/components/SidebarControls";
import { useContributorSidebarYear } from "@/hooks/useContributorSidebarYear";
import { DetailDrawer, DrawerTitle } from "@/components/DetailDrawer";
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
  const contributorSources = contributor.destinations.flatMap(
    (fund) => fund.supportingSources ?? [],
  );
  const isUnitemized = contributor.counterparty_group === "Unspecified";
  const amountLabel = isUnitemized
    ? "Voluntary contributions"
    : "Net contributions and transfers";
  const meta = selection.isInitialYear
    ? initialMeta
    : (selection.data?.meta ?? initialMeta);
  const ready = !selection.loading && !selection.error && !!currentContributor;
  const yearRanges = useYearRanges();
  const years = yearRanges.trustFundContributors.years;
  const canLinkToFunds = selection.year === yearRanges.budgetTrustFunds.default;
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
    <DetailDrawer
      titleId="trust-fund-contributor-title"
      onClose={onClose}
      className="sm:w-[32rem]"
    >
      <FinancialDetailPanel
        title={<DrawerTitle>{contributor.name}</DrawerTitle>}
        titleId="trust-fund-contributor-title"
        subtitle={`${isUnitemized ? "Contributors unspecified" : "Contributions and transfers · All contributor categories"} · ${selection.year}`}
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
            onClose={onClose}
            closeLabel="Close sidebar"
          />
        }
        total={
          ready
            ? {
                label: amountLabel,
                value: (
                  <Tooltip
                    interactive
                    width={380}
                    content={
                      <SourceCalculation
                        references={
                          isUnitemized
                            ? (contributor.flows?.flatMap(
                                (flow) => flow.supportingSources ?? [],
                              ) ?? contributorSources)
                            : contributorSources
                        }
                        amount={contributor.amount_usd}
                      />
                    }
                  >
                    <span
                      tabIndex={0}
                      className="cursor-help underline decoration-dotted underline-offset-4"
                    >
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
            {isUnitemized && (
              <p className="text-sm text-gray-600">
                Schedule 8.1 reports voluntary contributions by recipient fund
                without listing contributors.
              </p>
            )}
            {contributor.note && (
              <p className="text-sm text-gray-600">{contributor.note}</p>
            )}
            {contributor.negative_amount_usd < 0 && (
              <dl className="mt-2 space-y-1 text-xs text-gray-600">
                {[
                  {
                    label: "Positive rows",
                    amount: contributor.positive_amount_usd,
                  },
                  {
                    label: "Negative rows",
                    amount: contributor.negative_amount_usd,
                  },
                ].map(({ label, amount }) => {
                  const inputs = contributorSources.filter(
                    (source) =>
                      source.operand &&
                      (source.operand.rowSign ??
                        Math.sign(source.operand.amount)) === Math.sign(amount),
                  );
                  return (
                    <div key={label} className="flex justify-between">
                      <dt>{label}</dt>
                      <dd>
                        {inputs.length ? (
                          <Tooltip
                            interactive
                            width={380}
                            content={
                              <SourceCalculation
                                amount={amount}
                                references={inputs}
                              />
                            }
                          >
                            <span
                              tabIndex={0}
                              className="cursor-help underline decoration-dotted underline-offset-4"
                            >
                              {currency(amount)}
                            </span>
                          </Tooltip>
                        ) : (
                          currency(amount)
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
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
                      label: amountLabel,
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
                          .map((fund) => {
                            const label = fund.fund_code
                              ? `${fund.fund_code} · ${fund.fund_name}`
                              : fund.fund_name;
                            return (
                              <FinancialBreakdownRow
                                interactiveTooltip
                                key={fund.fund_id ?? fund.fund_code}
                                label={label}
                                value={currency(fund.amount_usd)}
                                bar={bar(fund.amount_usd)}
                                depth={1}
                                tooltip={
                                  <div>
                                    <p className="font-medium">{label}</p>
                                    <p>{group.entity_name}</p>
                                    <p>
                                      Contributions and transfers:{" "}
                                      {currency(fund.amount_usd)}
                                    </p>
                                    <SourceReferenceLinks
                                      references={fund.supportingSources ?? []}
                                    />
                                    {fund.fund_id && canLinkToFunds && (
                                      <Link
                                        className="text-un-blue hover:underline"
                                        href={`/secretariat/trust-funds/#trust-fund=${encodeURIComponent(fund.fund_id)}`}
                                      >
                                        Open fund details
                                      </Link>
                                    )}
                                  </div>
                                }
                              />
                            );
                          })}
                        {group.entity_id &&
                          (!isUnitemized || canLinkToFunds) && (
                            <li className="ps-3 pt-1">
                              <Link
                                className="text-sm text-un-blue hover:underline"
                                href={`/secretariat/trust-funds/#trust-fund=${encodeURIComponent(group.entity_id)}`}
                              >
                                {isUnitemized
                                  ? "Open spending details"
                                  : "Open office details"}
                              </Link>
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
    </DetailDrawer>
  );
}
