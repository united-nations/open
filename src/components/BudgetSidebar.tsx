"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import { ExpandableCard } from "@/components/ExpandableCard";
import { useCallback, useEffect, useState } from "react";
import {
  GroupedTreemap,
  type GroupedTreemapRow,
  type GroupedTreemapLeaf,
  type GroupedTreemapSegment,
  type GroupedTreemapSubgroup,
  type GroupedTreemapTooltipContext,
} from "@un-eosg/ui/components/grouped-treemap";
import type {
  BudgetFundingSource,
  BudgetMetricKey,
  BudgetMeta,
  BudgetNode,
  BudgetNodeSource,
} from "@/types";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SidebarControls } from "@/components/SidebarControls";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SHADE_OPACITY,
  FUNDING_SOURCES,
} from "@/lib/budgetGroupings";
import { BAND_PALETTE } from "@/lib/secretariatGroupings";
import { ProgrammeBudgetNodeTrend } from "@/components/ProgrammeBudgetNodeTrend";

const SHOW_SIDEBAR_MINI_TREEMAP = false;

interface BudgetSidebarProps {
  node: BudgetNode;
  parent: BudgetNode | null;
  childrenByParent: Record<string, BudgetNode[]>;
  meta: BudgetMeta;
  hashPrefix: string;
  dataset?: string;
  view?: "entity" | "section";
  years?: number[];
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

function uniqueSources(sources: Array<BudgetNodeSource | undefined>) {
  return sources.filter(
    (source, index): source is BudgetNodeSource =>
      source !== undefined &&
      sources.findIndex(
        (candidate) =>
          candidate?.url === source.url &&
          candidate.pdfPage === source.pdfPage &&
          candidate.rowLabel === source.rowLabel &&
          candidate.columnHeader === source.columnHeader,
      ) === index,
  );
}

function sourceKey(source: BudgetNodeSource) {
  return [
    source.url,
    source.pdfPage ?? "",
    source.rowLabel,
    source.columnHeader,
  ].join("|");
}

function amountSources(node: BudgetNode): BudgetNodeSource[] {
  if (
    node.allSourcesAmount !== undefined &&
    node.amount === node.allSourcesAmount &&
    node.sources?.total_all_sources
  ) {
    return [node.sources.total_all_sources];
  }
  const fundingSources = Object.keys(node.values ?? {}).map(
    (funding) => node.sources?.[funding as BudgetFundingSource],
  );
  const sources = uniqueSources(fundingSources);
  return sources.length > 0 ? sources : node.source ? [node.source] : [];
}

function BudgetAmount({
  amount,
  sources,
  className,
}: {
  amount: number;
  sources: BudgetNodeSource[];
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span>{formatBudget(amount)}</span>
      {uniqueSources(sources).map((source) => {
        const location = source.pdfPage
          ? `${source.symbol}, PDF page ${source.pdfPage}`
          : `${source.symbol} PDF`;
        return (
          <a
            key={sourceKey(source)}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open source for ${formatBudget(amount)}: ${location}`}
            title={`Open ${location}`}
            className="inline-flex shrink-0 text-un-blue hover:text-blue-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        );
      })}
    </span>
  );
}

const FUNDING_TREEMAP_COLORS: Record<BudgetFundingSource, string> = {
  regular_budget: "#009edb",
  other_assessed: "#4db8e8",
  extrabudgetary: "#99d6f2",
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

interface MiniBudgetLeafData {
  node?: BudgetNode;
  parentAmount: number;
  isGap?: boolean;
}

type MiniBudgetRow = GroupedTreemapRow<
  BudgetNode,
  BudgetNode,
  MiniBudgetLeafData,
  BudgetFundingSource
>;

function miniLeafLabel(node: BudgetNode): string {
  return node.entity?.name ?? node.label;
}

function miniFundingSegments(
  node: BudgetNode,
  color: string,
): GroupedTreemapSegment<BudgetFundingSource>[] {
  return positiveFundingValues(node).map(([source, value]) => ({
    key: source,
    label: FUNDING_SOURCES[source]?.label ?? source,
    value,
    color: `color-mix(in srgb, ${color} ${FUNDING_SHADE_OPACITY[source] * 100}%, white)`,
    data: source,
  }));
}

function miniNodeLeaf(
  node: BudgetNode,
  color: string,
  parentAmount: number,
): GroupedTreemapLeaf<MiniBudgetLeafData, BudgetFundingSource> {
  return {
    key: node.id,
    label: miniLeafLabel(node),
    value: node.amount,
    color,
    data: { node, parentAmount },
    segments: miniFundingSegments(node, color),
  };
}

function miniGapLeaf(
  key: string,
  label: string,
  amount: number,
  parentAmount: number,
): GroupedTreemapLeaf<MiniBudgetLeafData, BudgetFundingSource> {
  return {
    key,
    label,
    value: amount,
    color: "#d1d5db",
    textColor: "#1f2937",
    data: { parentAmount, isGap: true },
  };
}

function miniChildSubgroup(
  child: BudgetNode,
  index: number,
  childrenByParent: Record<string, BudgetNode[]>,
  stream: BudgetMeta["stream"],
): GroupedTreemapSubgroup<
  BudgetNode,
  MiniBudgetLeafData,
  BudgetFundingSource
> {
  const color = BAND_PALETTE[index % BAND_PALETTE.length].bg;
  const descendants =
    stream === "ppb" ? (childrenByParent[child.id] ?? []) : [];
  const positive = descendants.filter((descendant) => descendant.amount > 0);
  const leaves =
    positive.length > 0
      ? positive.map((descendant) =>
          miniNodeLeaf(descendant, color, child.amount),
        )
      : [miniNodeLeaf(child, color, child.amount)];
  const difference =
    child.amount -
    positive.reduce((sum, descendant) => sum + descendant.amount, 0);
  if (
    positive.length > 0 &&
    !descendants.some((descendant) => descendant.amount < 0) &&
    difference > 5000
  ) {
    leaves.push(
      miniGapLeaf(
        `${child.id}-not-itemized`,
        "Not itemized below this level",
        difference,
        child.amount,
      ),
    );
  }
  return {
    key: child.id,
    label: miniLeafLabel(child),
    data: child,
    labelVisibility: "tooltip-only",
    leaves,
  };
}

function miniFundingRows(
  node: BudgetNode,
  meta: BudgetMeta,
): MiniBudgetRow[] {
  const leaves = positiveFundingValues(node).map(([source, value]) => ({
    key: source,
    label:
      meta.fundingLabels?.[source] ??
      FUNDING_SOURCES[source]?.label ??
      source,
    value,
    color: FUNDING_TREEMAP_COLORS[source],
    textColor: source === "regular_budget" ? undefined : "#1f2937",
    data: { parentAmount: node.amount },
  }));
  return leaves.length > 0
    ? [{ key: node.id, label: miniLeafLabel(node), data: node, leaves }]
    : [];
}

function miniHierarchyRows(
  node: BudgetNode,
  childNodes: BudgetNode[],
  childrenByParent: Record<string, BudgetNode[]>,
  meta: BudgetMeta,
): MiniBudgetRow[] {
  const positive = childNodes.filter((child) => child.amount > 0);
  if (positive.length === 0) return miniFundingRows(node, meta);
  const subgroups = positive.map((child, index) =>
    miniChildSubgroup(child, index, childrenByParent, meta.stream),
  );
  const difference =
    node.amount - positive.reduce((sum, child) => sum + child.amount, 0);
  if (
    !childNodes.some((child) => child.amount < 0) &&
    difference > 5000
  ) {
    subgroups.push({
      key: `${node.id}-not-itemized`,
      label: "Not itemized",
      labelVisibility: "tooltip-only",
      leaves: [
        miniGapLeaf(
          `${node.id}-not-itemized-leaf`,
          "Not itemized in the published breakdown",
          difference,
          node.amount,
        ),
      ],
    });
  }
  return [{
    key: node.id,
    label: miniLeafLabel(node),
    data: node,
    subgroups,
  }];
}

function miniTreemapCaption(
  node: BudgetNode,
  childNodes: BudgetNode[],
  rows: MiniBudgetRow[],
): string {
  if (!childNodes.some((child) => child.amount > 0)) {
    return "Area shows the funding-source composition of this amount.";
  }
  const positiveTotal = childNodes
    .filter((child) => child.amount > 0)
    .reduce((sum, child) => sum + child.amount, 0);
  let caption = childNodes.some((child) => child.amount < 0)
    ? "Area compares the positive published lines; negative adjustments remain listed below."
    : node.amount - positiveTotal > 5000
      ? "Area shows the published lines; grey is the part not itemized below this level."
      : node.amount - positiveTotal < -5000
        ? "Area compares the published lines with one another; together they exceed the published parent total."
        : "Area shows each published line's share of this amount.";
  const leaves = rows.flatMap((row) =>
    (row.subgroups ?? []).flatMap((subgroup) => subgroup.leaves),
  );
  if (
    leaves.some(
      (leaf) => leaf.data?.node && leaf.data.node.parentId !== node.id,
    )
  ) {
    caption +=
      " Subdivisions show the next published level; hover or focus them for details.";
  }
  if (leaves.some((leaf) => (leaf.segments?.length ?? 0) > 1)) {
    caption += " Shades show funding sources in the order listed above.";
  }
  return caption;
}

function MiniBudgetTooltip({
  context,
  fundingLabels,
}: {
  context: GroupedTreemapTooltipContext<
    BudgetNode,
    BudgetNode,
    MiniBudgetLeafData,
    BudgetFundingSource
  >;
  fundingLabels?: BudgetMeta["fundingLabels"];
}) {
  const { leaf } = context;
  const node = leaf.data?.node;
  const kind = node ? KIND_NAMES[node.kind] : null;
  const parentAmount = leaf.data?.parentAmount ?? 0;
  const share = parentAmount > 0 ? (leaf.value / parentAmount) * 100 : 0;
  const segments = positiveFundingValues(node);
  return (
    <div className="space-y-1">
      {kind && (
        <p className="text-[10px] tracking-wide text-slate-400 uppercase">
          {kind}
        </p>
      )}
      <p className="font-medium">{leaf.label}</p>
      <p className="opacity-80">
        {formatBudget(leaf.value)}
        {parentAmount > 0 ? ` · ${share.toFixed(1)}%` : ""}
      </p>
      {segments.map(([source, amount]) => (
        <p key={source} className="flex justify-between gap-4 text-xs">
          <span>
            {fundingLabels?.[source] ??
              FUNDING_SOURCES[source]?.label ??
              source}
          </span>
          <span className="tabular-nums">{formatBudget(amount)}</span>
        </p>
      ))}
    </div>
  );
}

function MiniBudgetTreemap({
  node,
  childNodes,
  childrenByParent,
  meta,
}: {
  node: BudgetNode;
  childNodes: BudgetNode[];
  childrenByParent: Record<string, BudgetNode[]>;
  meta: BudgetMeta;
}) {
  const rows = miniHierarchyRows(node, childNodes, childrenByParent, meta);
  if (rows.length === 0) return null;
  const caption = miniTreemapCaption(node, childNodes, rows);
  return (
    <div>
      <GroupedTreemap<
        BudgetNode,
        BudgetNode,
        MiniBudgetLeafData,
        BudgetFundingSource
      >
        rows={rows}
        totalLabel="Total"
        height={176}
        showLeafValues
        formatValue={formatBudget}
        formatAccessibleValue={formatBudget}
        layout={{ rowOrder: "input", subgroupOrder: "input" }}
        renderTooltip={(context) => (
          <MiniBudgetTooltip
            context={context}
            fundingLabels={meta.fundingLabels}
          />
        )}
      />
      <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{caption}</p>
    </div>
  );
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
  nodes,
  childrenByParent,
  depth = 0,
  scaleMaximum,
  parentAmount,
}: {
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
    <ul className={depth === 0 ? "space-y-2" : "mt-2 space-y-2"}>
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
        const label = (
          <span className="min-w-0 leading-tight text-gray-700">
            {child.kind === "subprogramme" && (
              <span className="mb-0.5 block text-[10px] tracking-wide text-gray-400 uppercase">
                {KIND_NAMES.subprogramme}
              </span>
            )}
            <span className="block">{child.entity?.name ?? child.label}</span>
          </span>
        );
        const fundingValues = positiveFundingValues(child);
        const fundingTotal = fundingValues.reduce((sum, [, amount]) => sum + amount, 0);
        const bar = (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-label={`Funding sources for ${child.entity?.name ?? child.label}`}
                className="flex min-h-8 w-full items-center focus-visible:outline-2 focus-visible:outline-un-blue">
                <span className="relative block h-1.5 w-full overflow-hidden rounded-sm">
                  {depth > 0 && parentAmount !== undefined && (
                    <span className="absolute inset-y-0 start-0 rounded-sm bg-gray-200" style={{ width: `${scaledWidth(parentAmount)}%` }} />
                  )}
                  <span className="absolute inset-y-0 start-0 flex overflow-hidden rounded-sm bg-un-blue" style={{ width: `${scaledWidth(child.amount)}%` }}>
                    {fundingValues.map(([source, amount]) => (
                      <span key={source} className="h-full" style={{ width: `${amount / fundingTotal * 100}%`, backgroundColor: FUNDING_TREEMAP_COLORS[source] }} />
                    ))}
                  </span>
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="w-auto max-w-[calc(100vw-2rem)] space-y-2 rounded-lg bg-white p-3 text-black">
              <div className="grid grid-cols-[max-content_4rem_max-content] items-center gap-x-2 gap-y-2 text-xs">
              {fundingValues.map(([source, amount]) => (
                <div key={source} className="contents">
                  <span>{FUNDING_SOURCES[source].label}</span>
                  <div className="w-full">
                    <div className="h-1.5 rounded-sm" style={{ width: `${amount / fundingTotal * 100}%`, backgroundColor: FUNDING_TREEMAP_COLORS[source] }} />
                  </div>
                  <span className="text-end tabular-nums">{formatBudget(amount)}</span>
                </div>
              ))}
              </div>
              {fundingValues.length === 0 && <p className="text-xs">Funding-source breakdown unavailable.</p>}
            </TooltipContent>
          </Tooltip>
        );
        const rowContent = (
          <>
            {hasDescendants ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground group-hover:bg-muted group-hover:text-foreground">
                <ChevronRight aria-hidden="true" className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </span>
            ) : <span className="size-8" aria-hidden="true" />}
            {label}
            {bar}
            <span className="justify-self-end whitespace-nowrap text-gray-900">{formatBudget(child.amount)}</span>
          </>
        );
        const rowClass = "group grid min-h-11 w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_4rem_5.5rem] items-center gap-x-2 rounded-sm px-1 py-1 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue sm:grid-cols-[2rem_minmax(0,1fr)_5rem_6rem] sm:gap-x-3";
        return (
          <li key={child.id}>
            <div style={{ paddingInlineStart: `${depth * 0.75}rem` }}>
              {hasDescendants ? (
                <button type="button" aria-expanded={isExpanded} onClick={toggleExpanded} className={rowClass}>
                  {rowContent}
                </button>
              ) : (
                <div className={rowClass}>{rowContent}</div>
              )}
            </div>
            {hasDescendants && isExpanded && (
              <BudgetHierarchy
                nodes={descendants}
                childrenByParent={childrenByParent}
                depth={depth + 1}
                scaleMaximum={commonMaximum}
                parentAmount={child.amount}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function BudgetSidebar({
  node,
  parent,
  childrenByParent,
  meta,
  hashPrefix,
  dataset,
  view,
  years,
  onClose,
}: BudgetSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const focusTrapRef = useFocusTrap(true);
  const metricLabel = meta.measure === "approved"
    ? "Approved resources"
    : meta.measure === "proposed"
      ? "Proposed resources"
      : meta.metrics?.[meta.measure as BudgetMetricKey]?.label ?? "Expenditure";

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
    const sameEntity = node.entity && wrapper.entity &&
      (wrapper.entity.id ?? wrapper.entity.name) === (node.entity.id ?? node.entity.name);
    const descendants = childrenByParent[wrapper.id] ?? [];
    const repeatsTotal = Math.abs(wrapper.amount - node.amount) < 0.5;
    if ((!sameEntity && !repeatsTotal) || descendants.length === 0 || visitedWrappers.has(wrapper.id)) break;
    visitedWrappers.add(wrapper.id);
    breakdownNodes = descendants;
  }
  const hasBreakdown = breakdownNodes.length > 0 && !(
    breakdownNodes.length === 1 &&
    Math.abs(breakdownNodes[0].amount - node.amount) < 0.5 &&
    (childrenByParent[breakdownNodes[0].id] ?? []).length === 0
  );
  const fundingEntries = positiveFundingValues(node);
  const childSum = childNodes.reduce((sum, child) => sum + child.amount, 0);
  const childGap = node.amount - childSum;
  const labelledSourceReferences = fundingEntries.flatMap(([source]) => {
    const reference = node.sources?.[source];
    return reference
      ? [
          {
            fundingSource: source,
            reference,
          },
        ]
      : [];
  });
  const sourceReferences =
    labelledSourceReferences.length > 0
      ? labelledSourceReferences
      : amountSources(node).map((reference) => ({
          fundingSource: null,
          reference,
        }));
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

  const heading = view === "entity" && node.entity
    ? node.entity.name
    : node.tier === "section" ? node.label : (node.entity?.name ?? node.label);
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
            <SidebarControls
              shareHash={`${hashPrefix}=${encodeURIComponent(node.id)}`}
              onClose={handleClose}
              closeLabel="Close sidebar"
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
          {/* The sidebar always shows the full published funding-source view,
              independently of the filters applied to the main treemap. */}
          {fundingEntries.length > 0 && (
            <div>
              <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
                {metricLabel} {meta.fiscalYear} by funding source
              </h3>
              <div className="space-y-2">
                {fundingEntries.map(([key, amount]) => {
                  const style = FUNDING_SOURCES[key];
                  const label =
                    meta.fundingLabels?.[key] ?? style?.label ?? key;
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: FUNDING_TREEMAP_COLORS[key],
                        }}
                        title={style?.tooltip}
                      />
                      <span className="flex-1 text-gray-700">{label}</span>
                      <BudgetAmount
                        amount={amount}
                        sources={
                          node.sources?.[key as BudgetFundingSource]
                            ? [
                                node.sources[
                                  key as BudgetFundingSource
                                ] as BudgetNodeSource,
                              ]
                            : []
                        }
                        className="text-gray-900"
                      />
                    </div>
                  );
                })}
              </div>
              {node.completeness && node.completeness !== "complete" && (
                <p className="mt-2 text-xs text-gray-500">
                  Not every funding source is published for this line
                  {node.completeness === "not_published"
                    ? ""
                    : " (partly published)"}
                  .
                </p>
              )}
            </div>
          )}

          {/* Hierarchy or, for an undivided leaf, funding-source composition */}
          {hasBreakdown && (
            <div>
              <h3 className="mb-3 text-lg font-normal tracking-wider text-gray-900 uppercase">
                {breakdownHeading}
              </h3>
              {SHOW_SIDEBAR_MINI_TREEMAP && <MiniBudgetTreemap
                node={node}
                childNodes={childNodes}
                childrenByParent={childrenByParent}
                meta={meta}
              />}
              {childNodes.length > 0 && (
                <>
                  <div className="mt-4">
                    <BudgetHierarchy
                      nodes={breakdownNodes}
                      childrenByParent={childrenByParent}
                    />
                  </div>
                  {Math.abs(childGap) > (dataset?.startsWith("budget-ppb") ? 0.5 : 5000) && (
                    <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      The published parent total is {formatBudget(node.amount)},
                      but the published lines below add to{" "}
                      {formatBudget(childSum)}— a difference of{" "}
                      {Math.abs(childGap).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}.
                      {dataset?.startsWith("budget-ppb")
                        ? " Tile areas are scaled to fill the parent using the available breakdown; displayed amounts remain as published."
                        : " The parent total remains authoritative; this breakdown is flagged and is not used to size the main treemap."}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

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

          {/* Keep only references that take the reader to a concrete source. */}
          {(sourceReferences.length > 0 || meta.documentUrl) && (
            <ExpandableCard key={node.id} title="Source references">
              <div className="space-y-3">
                {sourceReferences.map(({ fundingSource, reference }) => (
                  <div
                    key={`${fundingSource ?? "all"}|${sourceKey(reference)}`}
                  >
                    {fundingSource && (
                      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                        {meta.fundingLabels?.[fundingSource] ??
                          FUNDING_SOURCES[fundingSource]?.label ??
                          fundingSource}
                      </p>
                    )}
                    {reference.tableTitle && (
                      <p className="mt-0.5 text-sm text-gray-700">
                        Table “{reference.tableTitle}”
                      </p>
                    )}
                    <p className="mt-0.5 text-sm text-gray-700">
                      Row “{reference.rowLabel}”, column “
                      {reference.columnHeader}”
                    </p>
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                    >
                      {reference.symbol}
                      {reference.pdfPage
                        ? `, PDF page ${reference.pdfPage}`
                        : " PDF"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
                {sourceReferences.length === 0 && meta.documentUrl && (
                  <a
                    href={meta.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                  >
                    {meta.documentSymbol ?? "Source document"} PDF
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </ExpandableCard>
          )}
        </div>
      </div>
    </div>
  );
}
