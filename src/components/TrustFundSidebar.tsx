"use client";
import {
  XBContributorPanel,
  ContributorSourceReferences,
} from "@/components/XBContributorPanel";
import { TrustFundFlowBreakdown } from "@/components/TrustFundFlowBreakdown";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";

import { useEffect, useState } from "react";
import { FinancialBreakdownRow } from "@un-eosg/ui/components/financial-breakdown-row";
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
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { collectBudgetHierarchySources } from "@/lib/budgetSourceCollection";
import { sourcePageUrl } from "@/lib/sourceReferences";
import { loadYearData } from "@/lib/data";
import { formatBudget } from "@un-eosg/ui/format-budget";
import type {
  BudgetData,
  BudgetMeta,
  BudgetNode,
  BudgetNodeSource,
  TrustFundContributorsData,
  XBContributorSeries,
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

function FundPosition({
  position,
}: {
  position: NonNullable<BudgetNode["financialPosition"]>;
}) {
  return (
    <div className="my-3 space-y-2 text-xs" data-fund-position>
      <p className="font-medium">
        Financial position · 31 December {position.asOf.slice(0, 4)}
      </p>
      {position.scopeNote && (
        <p className="text-gray-500">{position.scopeNote}</p>
      )}
      <dl className="space-y-2">
        {position.metrics.map((metric) => (
          <div key={metric.key} className="flex justify-between gap-4">
            <dt>{metric.label}</dt>
            <dd className="shrink-0 tabular-nums">
              {metric.amount === null ? (
                "Not available"
              ) : (
                <Tooltip
                  interactive
                  width={380}
                  content={
                    <div className="space-y-2">
                      {metric.components?.map((component) => (
                        <p
                          key={component.label}
                          className="flex justify-between gap-4"
                        >
                          <span>{component.label}</span>
                          <span>{formatBudget(component.amount)}</span>
                        </p>
                      ))}
                      <SourceReferenceLinks
                        references={metric.supportingSources}
                      />
                    </div>
                  }
                >
                  <span tabIndex={0}>{formatBudget(metric.amount)}</span>
                </Tooltip>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The same expandable row primitive used by the Programme Budget sidebar. */
function TrustFundHierarchy({
  nodes,
  childrenByParent,
  hashPrefix,
  depth = 0,
  maximum,
  showFinancialPosition = true,
}: {
  nodes: BudgetNode[];
  childrenByParent: Record<string, BudgetNode[]>;
  hashPrefix: string;
  depth?: number;
  maximum?: number;
  showFinancialPosition?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const scale = maximum ?? Math.max(0, ...nodes.map((node) => node.amount));
  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1"}>
      {[...nodes]
        .sort((a, b) => b.amount - a.amount)
        .map((child) => {
          const descendants = childrenByParent[child.id] ?? [];
          const hasChildren = descendants.length > 0;
          const position = showFinancialPosition
            ? child.financialPosition
            : undefined;
          const canExpand = hasChildren || !!position;
          const isExpanded = expanded.has(child.id);
          return (
            <FinancialBreakdownRow
              key={child.id}
              label={
                child.code ? `${child.code} · ${child.label}` : child.label
              }
              value={formatBudget(child.amount)}
              depth={depth}
              bar={
                <FinancialPanelBar
                  percent={
                    scale > 0
                      ? Math.max(0, Math.min(100, (child.amount / scale) * 100))
                      : 0
                  }
                  color="var(--color-un-blue)"
                />
              }
              expanded={isExpanded}
              onToggle={
                canExpand
                  ? () =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(child.id)) next.delete(child.id);
                        else next.add(child.id);
                        return next;
                      })
                  : undefined
              }
              interactiveTooltip
              tooltip={
                <div className="space-y-2">
                  <p className="font-medium">{child.label}</p>
                  <p>
                    {child.sourceMeasure}: {formatBudget(child.amount)}
                  </p>
                  <SourceReferenceLinks
                    references={child.supportingSources ?? []}
                  />
                  {!hasChildren && (
                    <button
                      type="button"
                      className="text-un-blue underline"
                      onClick={() => navigateToSidebar(hashPrefix, child.id)}
                    >
                      Open account details
                    </button>
                  )}
                </div>
              }
            >
              {isExpanded && (
                <>
                  {position && (
                    <div
                      style={{ paddingInlineStart: `${(depth + 1) * 0.75}rem` }}
                    >
                      <FundPosition position={position} />
                    </div>
                  )}
                  {hasChildren && (
                    <TrustFundHierarchy
                      nodes={descendants}
                      childrenByParent={childrenByParent}
                      hashPrefix={hashPrefix}
                      depth={depth + 1}
                      maximum={scale}
                      showFinancialPosition={showFinancialPosition}
                    />
                  )}
                </>
              )}
            </FinancialBreakdownRow>
          );
        })}
    </ul>
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
  const isSeparate = node.sourceGroup === "separate_entities";
  const showFinancialPosition =
    node.xbEntity !== "UNEP" && !node.id.startsWith("xb:UNEP:");
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
  const [xbContributorSeries, setXbContributorSeries] =
    useState<XBContributorSeries | null>(null);
  const [contributorsError, setContributorsError] = useState(false);
  const contributorsEnabled = node.contributorsAvailable !== false;
  const year = Number(meta.fiscalYear);
  const yearKey = years.join(",");
  const nodes = Object.values(childrenByParent).flat();
  const codes = fundCodes(node, nodes);
  const codesKey = [...codes].sort().join(",");
  useEffect(() => {
    let active = true;
    setTrend(null);
    setContributors(null);
    setXbContributorSeries(null);
    setContributorsError(false);
    setShowAllContributors(false);
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
              file.nodes.find((item) => item.id === node.id) ??
              (node.tier === "detail"
                ? file.nodes.find(
                    (item) =>
                      item.tier === "detail" &&
                      item.code === node.code &&
                      item.sourceGroup === node.sourceGroup,
                  )
                : undefined);
            const childNodes: Record<string, BudgetNode[]> = {};
            for (const item of file.nodes) {
              if (item.parentId) (childNodes[item.parentId] ??= []).push(item);
            }
            sourcesByYear[String(value)] = matched
              ? matched.chartAsAggregate
                ? (matched.supportingSources ?? [])
                : collectBudgetHierarchySources(matched, childNodes)
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
    if (contributorsEnabled)
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
  }, [
    node.id,
    node.code,
    node.tier,
    node.sourceGroup,
    contributorsEnabled,
    yearKey,
    year,
  ]);
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
    node.tier === "detail" || node.sourceGroup === "separate_entities"
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
  let backNode = nodes.find((item) => item.id === node.parentId);
  while (backNode?.detailGrouping)
    backNode = nodes.find((item) => item.id === backNode?.parentId);
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
            label: isSeparate
              ? "Expenditure"
              : (node.sourceMeasure ?? "Total expenditure"),
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
          {node.sourceGroup === "separate_entities" &&
            backNode?.tier === "budget_unit" && (
              <button
                type="button"
                className="mb-3 text-sm text-un-blue underline"
                onClick={() => navigateToSidebar(hashPrefix, backNode!.id)}
              >
                Back to {backNode.label}
              </button>
            )}
          {isSeparate ? (
            <p className="mb-3 text-sm text-gray-500">
              {node.chartAsAggregate
                ? node.xbEntity === "ITC"
                  ? "Gross extrabudgetary programme delivery."
                  : "Excluding regular-budget expenditure."
                : node.sourceMeasure}
            </p>
          ) : (
            node.note && <p className="mb-3 text-sm">{node.note}</p>
          )}
          {showFinancialPosition && node.financialPosition && (
            <FinancialPanelSection heading="Financial position">
              <p className="mb-3 text-sm text-gray-500">
                As at 31 December {year}. These are year-end balances, not
                annual flows.
              </p>
              {node.financialPosition.scopeNote && (
                <p className="mb-3 text-sm text-gray-500">
                  {node.financialPosition.scopeNote}
                </p>
              )}
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
              {isSeparate ? (
                <p className="mt-3 text-sm text-gray-500">
                  Year-end balances are distinct from annual expenditure. Net
                  assets are assets less liabilities.
                </p>
              ) : (
                <>
                  {" "}
                  <p className="mt-3 text-sm text-gray-500">
                    Receivables are amounts due, not cash received. Net assets
                    are assets less liabilities. Neither cash, receivables nor
                    net assets alone indicates funding available to spend.
                    Current and non-current balances are combined; these rows
                    overlap and must not be added together.
                  </p>
                </>
              )}
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
            <FinancialPanelSection heading={node.detailLabel ?? "Funds"}>
              {node.expenseReconciliation && (
                <p className="mb-3 text-sm text-gray-500">
                  Fund-account amounts are shown before consolidation and
                  therefore do not add up to the entity total.
                </p>
              )}
              {isSeparate ? (
                <TrustFundHierarchy
                  nodes={children}
                  childrenByParent={childrenByParent}
                  hashPrefix={hashPrefix}
                  showFinancialPosition={showFinancialPosition}
                />
              ) : (
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
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => navigateToSidebar(hashPrefix, child.id)}
                      >
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
                      </button>
                    </Tooltip>
                  ))}
                </div>
              )}
            </FinancialPanelSection>
          )}
          {contributorsEnabled && (
            <TrustFundFlowBreakdown
              flows={(contributors?.contributors ?? []).flatMap((item) =>
                item.destinations
                  .filter((fund) => includedCodes.has(fund.fund_code))
                  .flatMap((fund) => fund.flows ?? []),
              )}
            />
          )}
          {node.xbEntity !== "UNEP" && (
            <FinancialPanelSection heading="By contributor">
              {node.sourceGroup === "separate_entities" ? (
                <XBContributorPanel
                  key={`${node.id}:${year}`}
                  compact
                  entity={node.xbEntity ?? node.code ?? ""}
                  year={year}
                  scope={node.contributorScope ?? "entity"}
                  onSourceSeriesChange={setXbContributorSeries}
                />
              ) : !contributorsEnabled ? (
                <p className="text-sm text-gray-500">
                  Contributor data is unavailable for this reporting scope.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {(showAllContributors
                      ? donorRows
                      : donorRows.slice(0, 10)
                    ).map((donor) => (
                      <Tooltip
                        interactive
                        key={donor.name}
                        content={
                          <div>
                            <p>
                              {donor.name}: {formatBudget(donor.amount)}
                            </p>
                            <SourceReferenceLinks
                              references={donor.references}
                            />
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
                    ))}
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
                      No named contributor amounts are available for this fund
                      in this year.
                    </p>
                  )}
                  <p className="mt-3 text-sm text-gray-500">
                    These are contributions and transfers, not expenditure.
                    Contributor amounts may not cover all recognized
                    contributions and transfers; negative adjustments are
                    included in the amounts but have no bar.
                  </p>
                </>
              )}
            </FinancialPanelSection>
          )}
          {node.expenseReconciliation && (
            <details className="group/accounting mt-4">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
                <FinancialPanelHeading subheading>
                  Accounting details
                </FinancialPanelHeading>
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 group-open/accounting:rotate-90"
                />
              </summary>
              <div className="mt-3">
                <p className="mb-3 text-sm text-gray-500">
                  Account or segment expenses are reported before eliminations.
                  They are shown as source detail and are not added to the
                  entity total.
                </p>
                <dl className="space-y-2 text-sm">
                  {[
                    [
                      "Gross account / segment expenses",
                      node.expenseReconciliation.detailTotal,
                    ],
                    ["Eliminations", node.expenseReconciliation.eliminations],
                    [
                      "Entity expenditure excluding regular budget",
                      node.expenseReconciliation.entityTotal,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt>{label}</dt>
                      <dd className="tabular-nums">
                        {formatBudget(Number(value))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <SourceReferenceLinks
                  references={node.expenseReconciliation.supportingSources}
                />
              </div>
            </details>
          )}
          <details className="group/sources mt-4" data-expenditure-sources>
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
              {isSeparate && node.sourceMeasure && <p>{node.sourceMeasure}.</p>}
              {isSeparate && (
                <FinancialPanelHeading subheading>
                  Expenditure sources
                </FinancialPanelHeading>
              )}
              <SourceReferenceList
                references={
                  expenseReferences.length
                    ? expenseReferences
                    : node.source
                      ? [node.source]
                      : []
                }
              />
              {showFinancialPosition && node.financialPosition && (
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
              {isSeparate &&
                xbContributorSeries &&
                xbContributorSeries.entity === node.xbEntity &&
                xbContributorSeries.year === year && (
                  <div>
                    <FinancialPanelHeading subheading>
                      Contributor sources
                    </FinancialPanelHeading>
                    <ContributorSourceReferences
                      series={xbContributorSeries}
                      collapsible={false}
                    />
                  </div>
                )}
            </div>
          </details>
          {!!node.referenceSources?.length && (
            <div data-additional-resources>
              <FinancialPanelSection heading="Additional resources">
                <ul className="space-y-3 text-sm">
                  {node.referenceSources.map((source) => (
                    <li key={source.url}>
                      <a
                        className="text-un-blue underline"
                        href={
                          source.pdfPage
                            ? sourcePageUrl(source.url, source.pdfPage)
                            : source.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.symbol}
                        {source.pdfPage ? ` · PDF p. ${source.pdfPage}` : ""}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </FinancialPanelSection>
            </div>
          )}
        </FinancialDetailPanel>
      </aside>
    </div>
  );
}
