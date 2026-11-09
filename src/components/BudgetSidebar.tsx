"use client";
import { SourceReferenceLinks } from "@/components/SourceReferenceLinks";
import { SourceCalculation } from "@/components/SourceCalculation";
import { sourcePageUrl, sourcePages } from "@/lib/sourceReferences";
import { Tooltip } from "@un-eosg/ui/components/tooltip";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { fundingSources } from "@un-eosg/ui/funding-sources";
import { FundingSourceLabel } from "@un-eosg/ui/components/funding-source-label";

import { ChevronRight } from "lucide-react";
import { FinancialBreakdownRow } from "@un-eosg/ui/components/financial-breakdown-row";
import {
  FinancialPanelHeading,
  FinancialPanelBreakdownRow,
  FinancialPanelYearSelector,
  type FinancialPanelYearSelectorProps,
} from "@un-eosg/ui/components/financial-panel-parts";
import { useCallback, useEffect, useState } from "react";
import type {
  BudgetFundingSource,
  BudgetData,
  BudgetMetricKey,
  BudgetMeta,
  BudgetNode,
} from "@/types";
import { formatBudget } from "@/lib/entities";
import {
  budgetFundingEntries,
  formatBudgetNode,
  formatBudgetFunding,
} from "@/lib/budgetFunding";
import {
  collectBudgetNodeSources,
  collectBudgetHierarchySources,
  uniqueBudgetSources,
} from "@/lib/budgetSourceCollection";
import { SourceReferenceList } from "@/components/SourceReferenceList";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useContributorSidebarYear } from "@/hooks/useContributorSidebarYear";
import { SidebarControls } from "@/components/SidebarControls";
import { FiscalYearSelector } from "@/components/FiscalYearSelector";

import {
  auditedFiscalYearLabel,
  BUDGET_FUNDING_SOURCES,
  fiscalYearLabel,
  FUNDING_SOURCES,
} from "@/lib/budgetGroupings";
import { TrustFundSidebar } from "@/components/TrustFundSidebar";
import { ProgrammeBudgetNodeTrend } from "@/components/ProgrammeBudgetNodeTrend";


interface BudgetSidebarProps {
  node: BudgetNode;
  parent: BudgetNode | null;
  childrenByParent: Record<string, BudgetNode[]>;
  meta: BudgetMeta;
  hashPrefix: string;
  dataset?: string;
  view?: "entity" | "section";
  years?: number[];
  resolveYearNodes?: (data: BudgetData) => BudgetNode[];
  onClose: () => void;
}

const KIND_NAMES: Partial<Record<BudgetNode["kind"], string>> = {
  whole: "Total",
  part: "Budget part",
  entity: "Entity",
  programme: "Programme",
  component: "Component",
  subprogramme: "Subprogramme",
  allocation: "Allocation",
  section: "Section",
  mission: "Mission",
  class: "Cost class",
  item: "Cost item",
};

const FUNDING_TREEMAP_COLORS: Record<BudgetFundingSource, string> = {
  regular_budget: fundingSources.regular_budget.color,
  other_assessed: fundingSources.other_assessed.color,
  extrabudgetary: fundingSources.extrabudgetary.color,
};

function positiveFundingValues(
  node?: BudgetNode,
): [BudgetFundingSource, number][] {
  if (!node) return [];
  return BUDGET_FUNDING_SOURCES.map(
    (source) =>
      [source, node.values?.[source] ?? 0] as [BudgetFundingSource, number],
  ).filter(([, amount]) => amount > 0);
}

function maximumHierarchyAmount(
  nodes: BudgetNode[],
  childrenByParent: Record<string, BudgetNode[]>,
): number {
  return nodes.reduce(
    (maximum, child) =>
      Math.max(
        maximum,
        child.amount,
        maximumHierarchyAmount(
          childrenByParent[child.id] ?? [],
          childrenByParent,
        ),
      ),
    0,
  );
}

function BudgetHierarchy({
  metric = "expenditure",
  nodes,
  childrenByParent,
  depth = 0,
  scaleMaximum,
  parentAmount,
}: {
  metric?: BudgetMetricKey;
  nodes: BudgetNode[];
  childrenByParent: Record<string, BudgetNode[]>;
  depth?: number;
  scaleMaximum?: number;
  parentAmount?: number;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  // One quantitative scale for the entire expanded subtree, so bar lengths
  // remain directly comparable across hierarchy levels.
  const commonMaximum =
    scaleMaximum ?? maximumHierarchyAmount(nodes, childrenByParent);
  const scaledWidth = (amount: number) =>
    commonMaximum > 0
      ? Math.min(100, Math.max(0, (amount / commonMaximum) * 100))
      : 0;

  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1"}>
      {nodes.map((child) => {
        const descendants = childrenByParent[child.id] ?? [];
        const hasDescendants = descendants.length > 0;
        const isExpanded = expandedIds.has(child.id);
        const toggleExpanded = () => {
          if (!hasDescendants) return;
          setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(child.id)) next.delete(child.id);
            else next.add(child.id);
            return next;
          });
        };
        const fullName = child.entity?.name ?? child.label;
        const kindLabel = KIND_NAMES[child.kind] ?? child.kind;
        const badge =
          child.kind === "subprogramme" ? (
            <span
              aria-label="Subprogramme"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground"
            >
              SP
            </span>
          ) : undefined;
        const fundingValues = positiveFundingValues(child);
        const fundingTotal = fundingValues.reduce(
          (sum, [, amount]) => sum + amount,
          0,
        );
        const bar = (
          <span className="flex min-h-6 w-full items-center focus-visible:outline-2 focus-visible:outline-un-blue">
            <span className="relative block h-1.5 w-full overflow-hidden rounded-sm">
              {depth > 0 && parentAmount !== undefined && (
                <span
                  className="absolute inset-y-0 start-0 rounded-sm bg-gray-200"
                  style={{ width: `${scaledWidth(parentAmount)}%` }}
                />
              )}
              <span
                className="absolute inset-y-0 start-0 flex overflow-hidden rounded-sm bg-un-blue"
                style={{ width: `${scaledWidth(child.amount)}%` }}
              >
                {fundingValues.map(([source, amount]) => (
                  <span
                    key={source}
                    className="h-full"
                    style={{
                      width: `${(amount / fundingTotal) * 100}%`,
                      backgroundColor: FUNDING_TREEMAP_COLORS[source],
                    }}
                  />
                ))}
              </span>
            </span>
          </span>
        );
        const tooltipContent = (
          <FinancialTooltip
            title={fullName}
            context={kindLabel}
            total={{ label: "Total", value: formatBudgetNode(child) }}
            rows={fundingValues.map(([source, amount]) => ({
              label: FUNDING_SOURCES[source].label,
              value: formatBudgetFunding(child, source),
              color: FUNDING_TREEMAP_COLORS[source],
              share:
                fundingTotal > 0 && amount >= 0
                  ? amount / fundingTotal
                  : undefined,
            }))}
            notes={
              <>
                {fundingValues.length === 0
                  ? "Funding-source breakdown unavailable."
                  : undefined}
                <SourceReferenceLinks
                  references={collectBudgetNodeSources(child, metric)}
                />
              </>
            }
          />
        );
        return (
          <FinancialBreakdownRow
            key={child.id}
            label={fullName}
            badge={badge}
            value={formatBudgetNode(child)}
            bar={bar}
            interactiveTooltip
            tooltip={tooltipContent}
            depth={depth}
            expanded={isExpanded}
            onToggle={hasDescendants ? toggleExpanded : undefined}
          >
            {hasDescendants && isExpanded && (
              <BudgetHierarchy
                metric={metric}
                nodes={descendants}
                childrenByParent={childrenByParent}
                depth={depth + 1}
                scaleMaximum={commonMaximum}
                parentAmount={child.amount}
              />
            )}
          </FinancialBreakdownRow>
        );
      })}
    </ul>
  );
}

export function BudgetSidebar(props: BudgetSidebarProps) {
  if (props.meta.stream === "trust_funds")
    return (
      <TrustFundSidebar
        key={`${props.node.id}:${props.meta.fiscalYear}:${props.years?.join(",")}`}
        {...props}
      />
    );
  return (
    <BudgetYearSidebar key={`${props.node.id}:${props.meta.year}`} {...props} />
  );
}

function BudgetYearSidebar(props: BudgetSidebarProps) {
  const selection = useContributorSidebarYear<BudgetData>(
    props.dataset ?? `budget-${props.meta.stream}`,
    props.meta.year,
  );
  const nodes = selection.data
    ? (props.resolveYearNodes?.(selection.data) ?? selection.data.nodes)
    : [];
  const selectedNode = selection.isInitialYear
    ? props.node
    : nodes.find((node) => node.id === props.node.id);
  const childrenByParent: Record<string, BudgetNode[]> = {};
  for (const node of nodes) {
    if (node.parentId) (childrenByParent[node.parentId] ??= []).push(node);
  }
  const notice = selection.loading
    ? "Loading budget details…"
    : (selection.error ??
      (!selectedNode
        ? "No budget details are published for this item in the selected year."
        : undefined));
  const meta = selection.isInitialYear
    ? props.meta
    : (selection.data?.meta ?? {
        ...props.meta,
        year: selection.year,
        fiscalYear:
          props.meta.stream === "pko"
            ? (props.dataset?.startsWith("budget-audited-")
                ? auditedFiscalYearLabel
                : fiscalYearLabel)(selection.year)
            : String(selection.year),
      });
  return (
    <BudgetDetailSidebar
      {...props}
      node={selectedNode ?? props.node}
      parent={
        selection.isInitialYear
          ? props.parent
          : (nodes.find((node) => node.id === selectedNode?.parentId) ?? null)
      }
      childrenByParent={
        selection.isInitialYear ? props.childrenByParent : childrenByParent
      }
      meta={meta}
      yearSelector={{
        years: props.years ?? [props.meta.year],
        selected: selection.year,
        onChange: selection.setYear,
        label: "Select year",
        pending: selection.loading,
        pendingLabel: "Loading…",
      }}
      notice={notice}
    />
  );
}

function BudgetDetailSidebar({
  node,
  parent,
  childrenByParent,
  meta,
  hashPrefix,
  dataset,
  view,
  years,
  yearSelector,
  notice,
  onClose,
}: BudgetSidebarProps & {
  yearSelector: FinancialPanelYearSelectorProps;
  notice?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const focusTrapRef = useFocusTrap(true);
  const metricLabel =
    meta.measure === "approved"
      ? "Approved budget"
      : meta.measure === "proposed"
        ? "Proposed budget"
        : (meta.metrics?.[meta.measure as BudgetMetricKey]?.label ??
          "Expenditure");

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) handleClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const childNodes = childrenByParent[node.id] ?? [];
  let breakdownNodes = childNodes;
  const visitedWrappers = new Set<string>();
  while (breakdownNodes.length === 1) {
    const wrapper = breakdownNodes[0];
    const sameEntity =
      node.entity &&
      wrapper.entity &&
      (wrapper.entity.id ?? wrapper.entity.name) ===
        (node.entity.id ?? node.entity.name);
    const descendants = childrenByParent[wrapper.id] ?? [];
    const repeatsTotal = Math.abs(wrapper.amount - node.amount) < 0.5;
    if (
      (!sameEntity && !repeatsTotal) ||
      descendants.length === 0 ||
      visitedWrappers.has(wrapper.id)
    )
      break;
    visitedWrappers.add(wrapper.id);
    breakdownNodes = descendants;
  }
  const hasBreakdown =
    breakdownNodes.length > 0 &&
    !(
      breakdownNodes.length === 1 &&
      Math.abs(breakdownNodes[0].amount - node.amount) < 0.5 &&
      (childrenByParent[breakdownNodes[0].id] ?? []).length === 0
    );
  const fundingEntries = budgetFundingEntries(node);
  const childSum = childNodes.reduce((sum, child) => sum + child.amount, 0);
  const childGap = node.amount - childSum;
  const sourceMetric =
    meta.measure === "approved" || meta.measure === "proposed"
      ? meta.measure
      : "expenditure";
  // Match the hierarchy rendered below: hidden duplicate children and skipped
  // wrappers do not need their own rows in the citation table.
  const sourceReferences = uniqueBudgetSources([
    ...collectBudgetNodeSources(node, sourceMetric),
    ...(hasBreakdown
      ? breakdownNodes.flatMap((child) =>
          collectBudgetHierarchySources(child, childrenByParent, sourceMetric),
        )
      : []),
  ]);
  const titleId = "budget-sidebar-title";

  // What the row is, and where it sits. The rows below a budget unit keep the
  // name of their kind, because "component" and "subprogramme" are not the same
  // thing and the reader should not have to guess which one a row is.
  const subtitle = () => {
    if (node.tier === "section") return `Budget section ${node.code}`;
    if (node.tier === "part") return `Budget part ${node.code}`;
    if (node.tier === "mission")
      return meta.missionNames?.[node.code ?? ""] ?? "Peacekeeping mission";
    if (node.tier === "class")
      return meta.missionNames?.[node.mission ?? ""] ?? node.mission ?? "";
    if (node.tier === "item") return parent?.label ?? "";
    // One budget unit of a section — the level the treemap draws as tiles.
    if (node.tier === "budget_unit" && meta.stream === "trust_funds")
      return "Secretariat entity";
    if (node.entity?.relationship === "entity_aggregate")
      return parent?.tier === "part"
        ? `Entity in budget part ${parent.code}`
        : "Entity";
    if (node.tier === "budget_unit" && node.entity && meta.stream === "ppb")
      return parent?.tier === "section"
        ? `Budget section ${parent.code}: ${parent.label}`
        : "Secretariat entity";
    if (node.tier === "budget_unit")
      return parent ? `Budget unit of ${parent.label}` : "Budget unit";
    const kindName = KIND_NAMES[node.kind];
    if (kindName) return parent ? `${kindName} of ${parent.label}` : kindName;
    return meta.scopeLabel;
  };

  const heading =
    view === "entity" && node.entity
      ? node.entity.name
      : node.tier === "section"
        ? node.label
        : (node.entity?.name ?? node.label);
  const breakdownHeading = "Breakdown";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-busy={yearSelector.pending || undefined}
        aria-labelledby={titleId}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-300 bg-white px-6 pt-4 pb-2 sm:px-8 sm:pt-6 sm:pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                id={titleId}
                className="text-xl leading-tight font-bold text-gray-900 sm:text-2xl"
              >
                {node.tier === "mission" ? (node.code ?? node.label) : heading}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {node.entity?.acronym ? `${node.entity.acronym} · ` : ""}
                {subtitle()} · {meta.fiscalYear}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {meta.stream === "pko" ? (
                <FiscalYearSelector
                  {...yearSelector}
                  label="Select fiscal year"
                  formatLabel={
                    dataset?.startsWith("budget-audited-")
                      ? auditedFiscalYearLabel
                      : fiscalYearLabel
                  }
                />
              ) : (
                <FinancialPanelYearSelector {...yearSelector} variant="pill" />
              )}
              <SidebarControls
                shareHash={`${hashPrefix}=${encodeURIComponent(node.id)}`}
                onClose={handleClose}
                closeLabel="Close sidebar"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
          {notice ? (
            <p role="status" className="text-sm text-gray-600">
              {notice}
            </p>
          ) : (
            <>
              {/* The sidebar always shows the full published funding-source view,
              independently of the filters applied to the main treemap. */}
              {(fundingEntries.length > 0 ||
                (meta.stream === "ppb" &&
                  dataset?.startsWith("budget-ppb-") &&
                  (years?.length ?? 0) > 0)) && (
                <div>
                  <FinancialPanelHeading subheading className="mb-2">
                    {metricLabel} by funding source
                  </FinancialPanelHeading>
                  <div className="space-y-2">
                    {fundingEntries.map(([key, amount]) => {
                      const style = FUNDING_SOURCES[key];
                      const label =
                        meta.fundingLabels?.[key] ?? style?.label ?? key;
                      const references =
                        node.metricSources?.[sourceMetric]?.[key] ??
                        (sourceMetric === "expenditure" && node.sources?.[key]
                          ? [node.sources[key]!]
                          : []);
                      const provisionalPages =
                        node.entity?.acronym === "OCHA"
                          ? { first: 26, last: 28 }
                          : node.entity?.acronym === "UNDRR"
                            ? { first: 47, last: 48 }
                            : undefined;
                      const provisionalSource =
                        meta.year === 2025 &&
                        sourceMetric === "expenditure" &&
                        provisionalPages
                          ? references.find(
                              (source) =>
                                source.symbol === "A/81/6 (Sect. 27)" &&
                                sourcePages(source).some(
                                  (page) =>
                                    page >= provisionalPages.first &&
                                    page <= provisionalPages.last,
                                ),
                            )
                          : undefined;
                      const chf =
                        key === "extrabudgetary" ? node.chf : undefined;
                      return (
                        <FinancialPanelBreakdownRow
                          key={key}
                          label={
                            <FundingSourceLabel
                              source={key}
                              variant="inline"
                              label={label}
                              showMarker={false}
                            />
                          }
                          value={
                            <div className="text-end">
                              <Tooltip
                                interactive
                                content={
                                  chf ? (
                                    <>
                                      <SourceCalculation
                                        references={references.filter(
                                          (source) =>
                                            source.operand?.currency !== "CHF",
                                        )}
                                        amount={amount - chf.usdForLayout}
                                      />
                                      <SourceCalculation
                                        references={[chf.source]}
                                        amount={chf.amount}
                                        currency="CHF"
                                      />
                                    </>
                                  ) : (
                                    <SourceCalculation
                                      references={references}
                                      amount={amount}
                                    />
                                  )
                                }
                              >
                                <span
                                  tabIndex={0}
                                  className="cursor-help text-gray-900 underline decoration-dotted underline-offset-4"
                                >
                                  {formatBudgetFunding(node, key)}
                                </span>
                              </Tooltip>
                              {provisionalSource && provisionalPages && (
                                <a
                                  href={sourcePageUrl(
                                    provisionalSource.url,
                                    provisionalPages.first,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block text-xs font-normal text-gray-600 underline"
                                >
                                  The source reports this figure as provisional
                                </a>
                              )}
                            </div>
                          }
                          color={style?.color}
                          percent={
                            (Math.max(0, amount) /
                              Math.max(
                                1,
                                ...fundingEntries.map(([, value]) =>
                                  Math.max(0, value),
                                ),
                              )) *
                            100
                          }
                        />
                      );
                    })}
                  </div>
                  {BUDGET_FUNDING_SOURCES.some(
                    (source) =>
                      meta.fundingSources?.includes(source) &&
                      node.values?.[source] === undefined,
                  ) && (
                    <p className="mt-2 text-xs text-gray-500">
                      Some funding-source amounts are unavailable for this item;
                      missing amounts are not zero.
                    </p>
                  )}
                  {node.chf && (
                    <p className="mt-2 text-xs text-gray-500">
                      CHF amounts are printed in the PPB. Tile areas use the{" "}
                      {node.chf.year} time-weighted{" "}
                      <a
                        className="text-un-blue underline"
                        href={node.chf.rateSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        UN Treasury operational rates
                      </a>{" "}
                      for comparison on the USD scale.
                    </p>
                  )}
                  <div className="mt-4">
                    {meta.stream === "ppb" &&
                      dataset?.startsWith("budget-ppb-") &&
                      years &&
                      years.length > 0 && (
                        <ProgrammeBudgetNodeTrend
                          node={node}
                          dataset={dataset}
                          years={years}
                        />
                      )}
                  </div>
                </div>
              )}

              {/* Published hierarchy and funding-source details */}
              {hasBreakdown && (
                <div>
                  <FinancialPanelHeading subheading className="mb-3">
                    {breakdownHeading}
                  </FinancialPanelHeading>
                  {childNodes.length > 0 && (
                    <>
                      <div className="mt-4">
                        <BudgetHierarchy
                          metric={
                            meta.measure === "approved" ||
                            meta.measure === "proposed"
                              ? meta.measure
                              : "expenditure"
                          }
                          nodes={breakdownNodes}
                          childrenByParent={childrenByParent}
                        />
                      </div>
                      {Math.abs(childGap) > Math.abs(node.amount) * 0.001 && (
                        <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                          The published parent total is{" "}
                          {formatBudget(node.amount)}, but the published lines
                          below add to {formatBudget(childSum)}— a difference of{" "}
                          {formatBudget(Math.abs(childGap))}.
                          {dataset?.startsWith("budget-ppb")
                            ? " Tile areas are scaled to fill the parent using the available breakdown; displayed amounts remain as published."
                            : " The parent total remains authoritative; this breakdown is flagged and is not used to size the main treemap."}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Keep only references that take the reader to a concrete source. */}
              {(sourceReferences.length > 0 || meta.documentUrl) && (
                <details key={node.id} className="group/sources">
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
                    {sourceReferences.length > 0 && (
                      <>
                        <p className="text-sm text-gray-600">
                          {hasBreakdown
                            ? "References support this total and its breakdown."
                            : "References support the funding-source figures above."}{" "}
                          A calculated figure may combine several published
                          rows; repeated citations are shown once per budget
                          item.
                        </p>
                        <SourceReferenceList references={sourceReferences} />
                      </>
                    )}
                    {sourceReferences.length === 0 && meta.documentUrl && (
                      <SourceReferenceList
                        references={[
                          {
                            symbol: meta.documentSymbol ?? "Source document",
                            url: meta.documentUrl,
                            budgetItem: node.label,
                            label: metricLabel,
                            rowLabel: "",
                            columnHeader: meta.fiscalYear,
                          },
                        ]}
                      />
                    )}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
