"use client";

import { ChevronRight, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  BudgetFundingSource,
  BudgetMeta,
  BudgetNode,
  BudgetNodeSource,
} from "@/types";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ShareButton } from "@/components/ShareButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SHADE_OPACITY,
  FUNDING_SOURCES,
} from "@/lib/budgetGroupings";
import { BAND_PALETTE } from "@/lib/secretariatGroupings";
import { squarifyDense } from "@/lib/treemapLayout";

interface BudgetSidebarProps {
  node: BudgetNode;
  parent: BudgetNode | null;
  childrenByParent: Record<string, BudgetNode[]>;
  meta: BudgetMeta;
  hashPrefix: string;
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

interface MiniTreemapDatum {
  id: string;
  label: string;
  amount: number;
  color: string;
  node?: BudgetNode;
  isGap?: boolean;
  darkLabel?: boolean;
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

function FundingShadeLayers({
  node,
  color,
}: {
  node?: BudgetNode;
  color: string;
}) {
  const values = positiveFundingValues(node);
  const total = values.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col bg-white">
      {values.map(([source, amount]) => (
        <div
          key={source}
          style={{
            height: `${(amount / total) * 100}%`,
            backgroundColor: color,
            opacity: FUNDING_SHADE_OPACITY[source],
          }}
        />
      ))}
    </div>
  );
}

function FundingBreakdownRows({
  node,
  fundingLabels,
  shadeColor,
}: {
  node?: BudgetNode;
  fundingLabels?: BudgetMeta["fundingLabels"];
  shadeColor: string;
}) {
  const values = positiveFundingValues(node);
  const total = values.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) return null;

  return (
    <div className="mt-2 space-y-1 border-t border-slate-200 pt-2">
      {values.map(([source, amount]) => (
        <div key={source} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{
              backgroundColor: shadeColor,
              opacity: FUNDING_SHADE_OPACITY[source],
            }}
          />
          <span className="min-w-0 flex-1 text-slate-600">
            {fundingLabels?.[source] ??
              FUNDING_SOURCES[source]?.label ??
              source}
          </span>
          <span className="whitespace-nowrap text-slate-800">
            {formatBudget(amount)} · {((amount / total) * 100).toFixed(1)}%
          </span>
        </div>
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
  const positiveChildren = childNodes.filter((child) => child.amount > 0);
  const hasNegativeChild = childNodes.some((child) => child.amount < 0);
  const positiveChildTotal = positiveChildren.reduce(
    (sum, child) => sum + child.amount,
    0,
  );
  const gap = node.amount - positiveChildTotal;

  let data: MiniTreemapDatum[] = positiveChildren.map((child, index) => ({
    id: child.id,
    label: child.entity?.name ?? child.label,
    amount: child.amount,
    color: BAND_PALETTE[index % BAND_PALETTE.length].bg,
    node: child,
  }));
  let caption = "Area shows each published line's share of this amount.";

  if (hasNegativeChild) {
    caption =
      "Area compares the positive published lines; negative adjustments remain listed below.";
  } else if (gap > 5000) {
    data.push({
      id: `${node.id}-not-itemized`,
      label: "Not itemized in the published breakdown",
      amount: gap,
      color: "#d1d5db",
      isGap: true,
    });
    caption =
      "Area shows the published lines; grey is the part not itemized below this level.";
  } else if (gap < -5000) {
    caption =
      "Area compares the published lines with one another; together they exceed the published parent total.";
  }

  // A leaf can still have a meaningful funding-source composition. This keeps
  // the sidebar useful for entity rows that the document does not subdivide.
  if (data.length === 0) {
    data = Object.entries(node.values ?? {})
      .filter((entry): entry is [BudgetFundingSource, number] => entry[1] > 0)
      .map(([funding, amount]) => ({
        id: funding,
        label:
          meta.fundingLabels?.[funding] ??
          FUNDING_SOURCES[funding]?.label ??
          funding,
        amount,
        color: FUNDING_TREEMAP_COLORS[funding],
        darkLabel: funding !== "regular_budget",
      }));
    caption = "Area shows the funding-source composition of this amount.";
  }

  if (data.length === 0) return null;

  const rects = squarifyDense(
    data
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({ value: item.amount, data: item })),
    0,
    0,
    100,
    100,
  );
  const layeredRects = rects.map((rect) => {
    const item = rect.data;
    const grandchildren =
      meta.stream === "ppb" && item.node
        ? (childrenByParent[item.node.id] ?? [])
        : [];
    const positiveGrandchildren = grandchildren.filter(
      (child) => child.amount > 0,
    );
    const grandchildTotal = positiveGrandchildren.reduce(
      (sum, child) => sum + child.amount,
      0,
    );
    const grandchildGap = item.amount - grandchildTotal;
    const hasNegativeGrandchild = grandchildren.some(
      (child) => child.amount < 0,
    );
    const secondLevel: MiniTreemapDatum[] = positiveGrandchildren.map(
      (child) => ({
        id: child.id,
        label: child.entity?.name ?? child.label,
        amount: child.amount,
        color: item.color,
        node: child,
      }),
    );
    if (
      positiveGrandchildren.length > 0 &&
      !hasNegativeGrandchild &&
      grandchildGap > 5000 &&
      item.node
    ) {
      secondLevel.push({
        id: `${item.node.id}-not-itemized`,
        label: "Not itemized below this level",
        amount: grandchildGap,
        color: "#d1d5db",
        isGap: true,
      });
    }
    return {
      ...rect,
      secondLevelRects: squarifyDense(
        secondLevel
          .sort((a, b) => b.amount - a.amount)
          .map((child) => ({ value: child.amount, data: child })),
        0,
        0,
        100,
        100,
      ),
    };
  });
  if (layeredRects.some((rect) => rect.secondLevelRects.length > 0)) {
    caption +=
      " Subdivisions show the next published level; hover or focus them for details.";
  }
  if (
    layeredRects.some(
      (rect) =>
        positiveFundingValues(rect.data.node).length > 1 ||
        rect.secondLevelRects.some(
          (secondRect) =>
            positiveFundingValues(secondRect.data.node).length > 1,
        ),
    )
  ) {
    caption += " Shades show funding sources in the order listed above.";
  }

  return (
    <div>
      <div
        role="group"
        aria-label={`Treemap breakdown of ${node.entity?.name ?? node.label}`}
        className="relative h-44 w-full overflow-hidden rounded-sm bg-gray-100"
      >
        {layeredRects.map((rect) => {
          const item = rect.data;
          const showLabel = rect.width > 15 && rect.height > 14;
          const showAmount = rect.width > 24 && rect.height > 30;
          return (
            <div
              key={item.id}
              className="absolute overflow-hidden border border-white/70"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: item.color,
                backgroundImage: item.isGap
                  ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 4px, transparent 4px 8px)"
                  : undefined,
              }}
            >
              {rect.secondLevelRects.length === 0 && (
                <Tooltip delayDuration={75}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      aria-label={`${item.label}, ${formatBudget(item.amount)}`}
                      className="absolute inset-0 z-[1] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
                    >
                      {!item.isGap && (
                        <FundingShadeLayers
                          node={item.node}
                          color={item.color}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    collisionPadding={12}
                    className="max-w-72 border border-slate-200 bg-white text-slate-800 shadow-lg"
                  >
                    {item.node && KIND_NAMES[item.node.kind] && (
                      <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                        {KIND_NAMES[item.node.kind]}
                      </p>
                    )}
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-0.5 text-slate-600">
                      {formatBudget(item.amount)}
                    </p>
                    <FundingBreakdownRows
                      node={item.node}
                      fundingLabels={meta.fundingLabels}
                      shadeColor={item.color}
                    />
                  </TooltipContent>
                </Tooltip>
              )}
              {rect.secondLevelRects.map((secondRect) => {
                const secondItem = secondRect.data;
                const kind = secondItem.node
                  ? KIND_NAMES[secondItem.node.kind]
                  : null;
                const share =
                  item.amount > 0 ? (secondItem.amount / item.amount) * 100 : 0;
                return (
                  <Tooltip key={secondItem.id} delayDuration={75}>
                    <TooltipTrigger asChild>
                      <div
                        tabIndex={0}
                        aria-label={`${kind ? `${kind}: ` : ""}${secondItem.label}, ${formatBudget(secondItem.amount)}, ${share.toFixed(1)}% of ${item.label}`}
                        className="absolute border border-white/80 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset"
                        style={{
                          left: `${secondRect.x}%`,
                          top: `${secondRect.y}%`,
                          width: `${secondRect.width}%`,
                          height: `${secondRect.height}%`,
                          backgroundColor: secondItem.color,
                          backgroundImage: secondItem.isGap
                            ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 4px, transparent 4px 8px)"
                            : undefined,
                        }}
                      >
                        {!secondItem.isGap && (
                          <FundingShadeLayers
                            node={secondItem.node}
                            color={secondItem.color}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      collisionPadding={12}
                      className="max-w-64 border border-slate-200 bg-white text-slate-800 shadow-lg"
                    >
                      {kind && (
                        <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                          {kind}
                        </p>
                      )}
                      <p className="font-medium">{secondItem.label}</p>
                      <p className="mt-0.5 text-slate-600">
                        {formatBudget(secondItem.amount)} · {share.toFixed(1)}%
                        of {item.label}
                      </p>
                      <FundingBreakdownRows
                        node={secondItem.node}
                        fundingLabels={meta.fundingLabels}
                        shadeColor={secondItem.color}
                      />
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {showLabel && (
                <div
                  className={`pointer-events-none absolute bottom-px left-px z-[2] max-h-[calc(100%-2px)] max-w-[calc(100%-2px)] overflow-hidden px-1.5 py-1 leading-tight ${item.isGap || item.darkLabel ? "text-gray-800" : "text-white"}`}
                  style={{ backgroundColor: item.color }}
                >
                  <span className="line-clamp-2 text-[11px] font-medium">
                    {item.label}
                  </span>
                  {showAmount && (
                    <span className="mt-0.5 block text-[10px] opacity-90">
                      {formatBudget(item.amount)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
        const fundingValues = positiveFundingValues(child);
        const barColor = depth === 0 ? "#009edb" : "#4a7c7e";
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
          <>
            {hasDescendants ? (
              <ChevronRight
                aria-hidden="true"
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="min-w-0 leading-tight text-gray-700">
              {KIND_NAMES[child.kind] && (
                <span className="mb-0.5 block text-[10px] tracking-wide text-gray-400 uppercase">
                  {KIND_NAMES[child.kind]}
                </span>
              )}
              <span className="block">{child.entity?.name ?? child.label}</span>
            </span>
          </>
        );
        const bar = (
          <div
            tabIndex={fundingValues.length > 0 ? 0 : undefined}
            aria-label={
              fundingValues.length > 0
                ? `${child.entity?.name ?? child.label}: funding-source breakdown`
                : undefined
            }
            className="relative h-1.5 w-full overflow-hidden rounded-sm focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {depth > 0 && parentAmount !== undefined && (
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-gray-200"
                style={{ width: `${scaledWidth(parentAmount)}%` }}
              />
            )}
            {fundingValues.length > 0 ? (
              <>
                {fundingValues.map(([source, amount], index) => {
                  const precedingAmount = fundingValues
                    .slice(0, index)
                    .reduce((sum, [, value]) => sum + value, 0);
                  return (
                    <div
                      key={source}
                      className="absolute inset-y-0"
                      style={{
                        left: `${scaledWidth(precedingAmount)}%`,
                        width: `${scaledWidth(amount)}%`,
                        backgroundColor: barColor,
                        opacity: FUNDING_SHADE_OPACITY[source],
                      }}
                    />
                  );
                })}
                {fundingValues.slice(1).map(([source], index) => {
                  const precedingAmount = fundingValues
                    .slice(0, index + 1)
                    .reduce((sum, [, value]) => sum + value, 0);
                  return (
                    <div
                      key={`separator-${source}`}
                      className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-white"
                      style={{
                        left: `${scaledWidth(precedingAmount)}%`,
                      }}
                    />
                  );
                })}
              </>
            ) : (
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${scaledWidth(child.amount)}%`,
                  backgroundColor: barColor,
                }}
              />
            )}
          </div>
        );
        return (
          <li key={child.id}>
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_5.5rem] items-center gap-x-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_6rem]">
              {hasDescendants ? (
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={toggleExpanded}
                  className="flex min-w-0 cursor-pointer items-start gap-1 text-left hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
                  style={{ paddingLeft: `${depth * 0.75}rem` }}
                >
                  {label}
                </button>
              ) : (
                <div
                  className="flex min-w-0 items-start gap-1"
                  style={{ paddingLeft: `${depth * 0.75}rem` }}
                >
                  {label}
                </div>
              )}
              {fundingValues.length > 0 ? (
                <Tooltip delayDuration={75}>
                  <TooltipTrigger asChild>{bar}</TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    collisionPadding={12}
                    className="max-w-72 border border-slate-200 bg-white text-slate-800 shadow-lg"
                  >
                    <p className="font-medium">
                      {child.entity?.name ?? child.label}
                    </p>
                    <FundingBreakdownRows node={child} shadeColor={barColor} />
                  </TooltipContent>
                </Tooltip>
              ) : (
                bar
              )}
              <BudgetAmount
                amount={child.amount}
                sources={amountSources(child)}
                className="justify-self-end whitespace-nowrap text-gray-900"
              />
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
  onClose,
}: BudgetSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const focusTrapRef = useFocusTrap(true);

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
    if (node.tier === "budget_unit")
      return parent ? `Budget unit of ${parent.label}` : "Budget unit";
    const kindName = KIND_NAMES[node.kind];
    if (kindName) return parent ? `${kindName} of ${parent.label}` : kindName;
    return meta.scopeLabel;
  };

  // The heading names the organization where the release evidences one, because
  // that is what the tile said.
  const heading = node.entity?.name ?? node.label;

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
            <div className="flex items-center gap-2">
              <ShareButton
                hash={`${hashPrefix}=${encodeURIComponent(node.id)}`}
              />
              <button
                onClick={handleClose}
                className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:outline-none"
                aria-label="Close sidebar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
          {/* The sidebar always shows the full published funding-source view,
              independently of the filters applied to the main treemap. */}
          {fundingEntries.length > 0 && (
            <div>
              <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
                Expenditure {meta.fiscalYear} by funding source
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
          {(childNodes.length > 0 || fundingEntries.length > 1) && (
            <div>
              <h3 className="mb-3 text-lg font-normal tracking-wider text-gray-900 uppercase">
                Budget breakdown
              </h3>
              <MiniBudgetTreemap
                node={node}
                childNodes={childNodes}
                childrenByParent={childrenByParent}
                meta={meta}
              />
              {childNodes.length > 0 && (
                <>
                  <div className="mt-4">
                    <BudgetHierarchy
                      nodes={childNodes}
                      childrenByParent={childrenByParent}
                    />
                  </div>
                  {Math.abs(childGap) > 5000 && (
                    <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                      The published parent total is {formatBudget(node.amount)},
                      but the published lines below add to{" "}
                      {formatBudget(childSum)}— a difference of{" "}
                      {formatBudget(Math.abs(childGap))}. The parent total
                      remains authoritative; this breakdown is flagged and is
                      not used to size the main treemap.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Keep only references that take the reader to a concrete source. */}
          {(sourceReferences.length > 0 || meta.documentUrl) && (
            <div>
              <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
                Source references
              </h3>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
