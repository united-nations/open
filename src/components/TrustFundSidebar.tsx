"use client";
import { TrustFundFlowBreakdown } from "@/components/TrustFundFlowBreakdown";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelSection,
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { SidebarControls } from "@/components/SidebarControls";
import {
  FinancingInstrumentChart,
  type FinancingInstrumentDataPoint,
} from "@/components/charts/FinancingInstrumentChart";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { collectBudgetHierarchySources } from "@/lib/budgetSourceCollection";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@un-eosg/ui/format-budget";
import type {
  BudgetData,
  BudgetMeta,
  BudgetNode,
  BudgetNodeSource,
  TrustFundContributorsData,
} from "@/types";

function fundCodes(node: BudgetNode, nodes: BudgetNode[]): Set<string> {
  if (node.tier === "detail") return new Set(node.code ? [node.code] : []);
  const ids = new Set([node.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of nodes)
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
  }
  return new Set(
    nodes
      .filter((item) => item.tier === "detail" && ids.has(item.id) && item.code)
      .map((item) => item.code!),
  );
}

export function TrustFundSidebar({
  node,
  meta,
  years = [],
  childrenByParent,
  hashPrefix,
  onClose,
}: {
  node: BudgetNode;
  meta: BudgetMeta;
  years?: number[];
  childrenByParent: Record<string, BudgetNode[]>;
  hashPrefix: string;
  onClose: () => void;
}) {
  const focusTrapRef = useFocusTrap(true);
  const [showAllContributors, setShowAllContributors] = useState(false);
  const [trendSources, setTrendSources] = useState<
    Record<string, BudgetNodeSource[]>
  >({});
  const [trend, setTrend] = useState<FinancingInstrumentDataPoint[] | null>(
    null,
  );
  const [trendIncomplete, setTrendIncomplete] = useState(false);
  const [contributors, setContributors] =
    useState<TrustFundContributorsData | null>(null);
  const [contributorsError, setContributorsError] = useState(false);
  const year = Number(meta.fiscalYear);
  const yearKey = years.join(",");
  const nodes = Object.values(childrenByParent).flat();
  const codes = fundCodes(node, nodes);
  const codesKey = [...codes].sort().join(",");
  useEffect(() => {
    let active = true;
    const sourcesByYear: Record<string, BudgetNodeSource[]> = {};
    Promise.all(
      yearKey
        .split(",")
        .filter(Boolean)
        .map(Number)
        .map(async (value) => {
          try {
            const file = await loadYearData<BudgetData>(
              "budget-trust-funds",
              value,
            );
            const matched =
              node.tier === "detail"
                ? file.nodes.find(
                    (item) => item.tier === "detail" && item.code === node.code,
                  )
                : file.nodes.find((item) => item.id === node.id);
            const childNodes: Record<string, BudgetNode[]> = {};
            for (const item of file.nodes) {
              if (item.parentId) (childNodes[item.parentId] ??= []).push(item);
            }
            sourcesByYear[String(value)] = matched
              ? collectBudgetHierarchySources(matched, childNodes)
              : [];
            return {
              year: String(value),
              ...(matched ? { expenses: matched.amount } : {}),
            };
          } catch {
            return { year: String(value) };
          }
        }),
    ).then((points) => {
      if (active) {
        setTrendSources(sourcesByYear);
        setTrend(points);
        setTrendIncomplete(points.some((point) => !("expenses" in point)));
      }
    });
    loadYearData<TrustFundContributorsData>("trust-fund-contributors", year)
      .then((data) => {
        if (active) setContributors(data);
      })
      .catch(() => {
        if (active) setContributorsError(true);
      });
    return () => {
      active = false;
    };
  }, [node.id, node.code, node.tier, yearKey, year]);
  useEffect(() => {
    const root = document.documentElement;
    const overflow = root.style.overflow,
      gutter = root.style.scrollbarGutter;
    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "auto";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      root.style.overflow = overflow;
      root.style.scrollbarGutter = gutter;
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  const includedCodes = new Set(codesKey.split(","));
  const donorRows =
    contributors?.contributors
      .map((donor) => ({
        name: donor.name,
        references: donor.destinations
          .filter((destination) => includedCodes.has(destination.fund_code))
          .flatMap((destination) => destination.supportingSources ?? []),
        amount: donor.destinations
          .filter((destination) => includedCodes.has(destination.fund_code))
          .reduce((sum, item) => sum + item.amount_usd, 0),
      }))
      .filter((donor) => donor.amount !== 0)
      .sort((a, b) => b.amount - a.amount) ?? [];
  const expenseReferences =
    node.tier === "detail"
      ? (node.supportingSources ?? [])
      : nodes
          .filter(
            (item) =>
              item.tier === "detail" &&
              item.code &&
              includedCodes.has(item.code),
          )
          .flatMap((item) => item.supportingSources ?? []);
  const contributionReferences =
    contributors?.contributors.flatMap((contributor) =>
      contributor.destinations
        .filter((destination) => includedCodes.has(destination.fund_code))
        .flatMap((destination) => destination.supportingSources ?? []),
    ) ?? [];
  const maximum = Math.max(0, ...donorRows.map((donor) => donor.amount));
  const children = [...(childrenByParent[node.id] ?? [])].sort(
    (a, b) => b.amount - a.amount,
  );
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-fund-title"
        className="h-full w-full bg-white shadow-2xl sm:w-[32rem]"
      >
        <FinancialDetailPanel
          title={node.code ?? node.label}
          titleId="trust-fund-title"
          subtitle={
            <>
              {node.label} · {meta.fiscalYear}
            </>
          }
          controls={
            <SidebarControls
              shareHash={`${hashPrefix}=${encodeURIComponent(node.id)}`}
              onClose={onClose}
              closeLabel="Close fund details"
            />
          }
          total={{
            label: "Total expenditure",
            value: (
              <Tooltip
                interactive
                width={380}
                content={
                  <SourceReferenceLinks
                    references={
                      expenseReferences.length
                        ? expenseReferences
                        : node.source
                          ? [node.source]
                          : []
                    }
                  />
                }
              >
                <span tabIndex={0}>{formatBudget(node.amount)}</span>
              </Tooltip>
            ),
          }}
          className="bg-white sm:w-full"
        >
          {node.note && <p className="mb-3 text-sm">{node.note}</p>}
          {node.financialPosition && (
            <FinancialPanelSection heading="Financial position">
              <p className="mb-3 text-sm text-gray-500">
                As at 31 December {year}. These are year-end balances, not
                annual flows.
              </p>
              <dl className="space-y-3">
                {node.financialPosition.metrics.map((metric) => (
                  <div
                    key={metric.key}
                    className="flex items-baseline justify-between gap-4 text-sm"
                  >
                    <dt>{metric.label}</dt>
                    <dd className="shrink-0 text-right tabular-nums">
                      {metric.amount === null ? (
                        <span
                          title={`${metric.fundsCovered} of ${node.financialPosition!.fundCount} funds have source data`}
                        >
                          Not available
                        </span>
                      ) : (
                        <Tooltip
                          interactive
                          width={380}
                          content={
                            <div className="space-y-2">
                              <p className="font-semibold">{metric.label}</p>
                              {metric.components?.map((component) => (
                                <div
                                  key={component.label}
                                  className="flex justify-between gap-4"
                                >
                                  <span>{component.label}</span>
                                  <span>{formatBudget(component.amount)}</span>
                                </div>
                              ))}
                              <SourceReferenceLinks
                                references={metric.supportingSources}
                              />
                            </div>
                          }
                        >
                          <span tabIndex={0}>
                            {formatBudget(metric.amount)}
                          </span>
                        </Tooltip>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-gray-500">
                Receivables are amounts due, not cash received. Net assets are
                assets less liabilities. Neither cash, receivables nor net
                assets alone indicates funding available to spend. Current and
                non-current balances are combined; these rows overlap and must
                not be added together.
              </p>
              {node.financialPosition.fundCount > 1 && (
                <p className="mt-2 text-sm text-gray-500">
                  Sum of {node.financialPosition.fundCount} fund accounts,
                  without eliminating balances between funds.
                </p>
              )}
            </FinancialPanelSection>
          )}
          <FinancialPanelSection heading="Expenditure history">
            {trend === null ? (
              <p role="status" className="text-sm text-gray-500">
                Loading trend…
              </p>
            ) : (
              <FinancingInstrumentChart
                tooltipSources={(year, visibleKeys) =>
                  visibleKeys.includes("expenses")
                    ? (trendSources[year] ?? [])
                    : []
                }
                compact
                showLegend={false}
                data={trend}
                series={[
                  {
                    key: "expenses",
                    label: "Expenditure",
                    color: "var(--color-un-blue)",
                  },
                ]}
              />
            )}
            {trendIncomplete && (
              <p className="mt-2 text-sm text-gray-500">
                Unavailable years appear as gaps.
              </p>
            )}
          </FinancialPanelSection>
          {children.length > 0 && (
            <FinancialPanelSection heading="Funds">
              <div className="space-y-3">
                {children.map((child) => (
                  <Tooltip
                    interactive
                    key={child.id}
                    width={380}
                    content={
                      <div>
                        <p>
                          {child.label}: {formatBudget(child.amount)}
                        </p>
                        <SourceReferenceLinks
                          references={
                            child.supportingSources ??
                            (child.source ? [child.source] : [])
                          }
                        />
                      </div>
                    }
                  >
                    <div tabIndex={0}>
                      <FinancialPanelRankedRow
                        label={child.code ?? child.label}
                        title={child.label}
                        value={formatBudget(child.amount)}
                      >
                        <FinancialPanelBar
                          percent={
                            children[0].amount > 0
                              ? (child.amount / children[0].amount) * 100
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
          )}
          <TrustFundFlowBreakdown
            flows={(contributors?.contributors ?? []).flatMap((item) =>
              item.destinations
                .filter((fund) => includedCodes.has(fund.fund_code))
                .flatMap((fund) => fund.flows ?? []),
            )}
          />
          <FinancialPanelSection heading="By contributor">
            <div className="space-y-3">
              {(showAllContributors ? donorRows : donorRows.slice(0, 10)).map(
                (donor) => (
                  <Tooltip
                    interactive
                    key={donor.name}
                    content={
                      <div>
                        <p>
                          {donor.name}: {formatBudget(donor.amount)}
                        </p>
                        <SourceReferenceLinks references={donor.references} />
                      </div>
                    }
                  >
                    <div tabIndex={0}>
                      <FinancialPanelRankedRow
                        label={donor.name}
                        value={formatBudget(donor.amount)}
                      >
                        <FinancialPanelBar
                          percent={
                            maximum > 0 ? (donor.amount / maximum) * 100 : 0
                          }
                          color="var(--color-un-blue)"
                        />
                      </FinancialPanelRankedRow>
                    </div>
                  </Tooltip>
                ),
              )}
            </div>
            {donorRows.length > 10 && (
              <button
                type="button"
                aria-expanded={showAllContributors}
                onClick={() => setShowAllContributors((value) => !value)}
                className="mt-2 text-xs text-gray-600 underline hover:text-gray-900"
              >
                {showAllContributors
                  ? "Show fewer contributors"
                  : `Show all ${donorRows.length} contributors`}
              </button>
            )}
            {!contributors && (
              <p role="status" className="text-sm text-gray-500">
                {contributorsError
                  ? "Contributor data is unavailable for this year."
                  : "Loading contributors…"}
              </p>
            )}
            {contributors && donorRows.length === 0 && (
              <p className="text-sm text-gray-500">
                No named contributor amounts are available for this fund in this
                year.
              </p>
            )}
            <p className="mt-3 text-sm text-gray-500">
              These are contributions and transfers, not expenditure.
              Contributor amounts may not cover all receipts; negative
              adjustments are included in the amounts but have no bar.
            </p>
          </FinancialPanelSection>
          <details className="group/sources mt-4">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
              <FinancialPanelHeading subheading>
                Source references
              </FinancialPanelHeading>
              <ChevronRight
                aria-hidden="true"
                className="size-3 group-open/sources:rotate-90"
              />
            </summary>
            <div className="mt-3 space-y-3 text-sm">
              <SourceReferenceList
                references={
                  expenseReferences.length
                    ? expenseReferences
                    : node.source
                      ? [node.source]
                      : []
                }
              />
              {node.financialPosition && (
                <SourceReferenceList
                  references={node.financialPosition.metrics.flatMap(
                    (metric) => metric.supportingSources,
                  )}
                />
              )}
              {contributors && (
                <>
                  <SourceReferenceList
                    references={
                      contributionReferences.length
                        ? contributionReferences
                        : [
                            {
                              ...contributors.meta.source,
                              rowLabel: "Contributions and transfers",
                              columnHeader: String(year),
                            },
                          ]
                    }
                  />
                  <p>
                    {contributors.meta.method_note}{" "}
                    {contributors.meta.mapping_note}
                  </p>
                </>
              )}
            </div>
          </details>
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
