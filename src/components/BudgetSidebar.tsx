"use client";

import { ExternalLink, X } from "lucide-react";
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
  ENTITY_RELATIONSHIP_NOTES,
  FUNDING_SOURCES,
  unitExplanation,
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
      sources.findIndex((candidate) => candidate?.url === source.url) === index,
  );
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
            key={source.url}
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
}

const FUNDING_TREEMAP_COLORS: Record<BudgetFundingSource, string> = {
  regular_budget: "#009edb",
  other_assessed: "#4a7c7e",
  extrabudgetary: "#006b96",
};

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
    if (!hasNegativeGrandchild && grandchildGap > 5000 && item.node) {
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
              title={
                rect.secondLevelRects.length === 0
                  ? `${item.label}: ${formatBudget(item.amount)}`
                  : undefined
              }
            >
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
                      />
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
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {showLabel && (
                <div
                  className={`pointer-events-none relative z-[2] flex h-full flex-col justify-end p-1.5 leading-tight ${item.isGap ? "text-gray-800" : "text-white"}`}
                >
                  <span className="line-clamp-2 text-[11px] font-medium">
                    {item.label}
                  </span>
                  {showAmount && (
                    <span className="mt-0.5 text-[10px] opacity-90">
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
}: {
  nodes: BudgetNode[];
  childrenByParent: Record<string, BudgetNode[]>;
  depth?: number;
  scaleMaximum?: number;
}) {
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
        return (
          <li key={child.id}>
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_5.5rem] items-center gap-x-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_6rem]">
              <span
                className="min-w-0 leading-tight text-gray-700"
                style={{ paddingLeft: `${depth * 0.75}rem` }}
              >
                {KIND_NAMES[child.kind] && (
                  <span className="mb-0.5 block text-[10px] tracking-wide text-gray-400 uppercase">
                    {KIND_NAMES[child.kind]}
                  </span>
                )}
                <span className="block">
                  {child.entity?.name ?? child.label}
                </span>
              </span>
              <div className="h-1.5 w-full">
                <div
                  className="h-full rounded-sm bg-un-blue"
                  style={{ width: `${scaledWidth(child.amount)}%` }}
                />
              </div>
              <BudgetAmount
                amount={child.amount}
                sources={amountSources(child)}
                className="justify-self-end whitespace-nowrap text-gray-900"
              />
            </div>
            {descendants.length > 0 && (
              <BudgetHierarchy
                nodes={descendants}
                childrenByParent={childrenByParent}
                depth={depth + 1}
                scaleMaximum={commonMaximum}
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

  const shareOfTotal = meta.total > 0 ? (node.amount / meta.total) * 100 : 0;
  const childNodes = childrenByParent[node.id] ?? [];
  const fundingEntries = Object.entries(node.values ?? {}).filter(
    ([, v]) => v > 0,
  );
  // The published total leaves out any section that prints only one funding
  // source (International Trade Centre, in the 2027 edition), but the
  // funding-source rows still contain it. Say so, rather than let the reader
  // add the rows up and find a different number.
  const fundingSum = fundingEntries.reduce((s, [, v]) => s + v, 0);
  const fundingGap = fundingSum - node.amount;
  const childSum = childNodes.reduce((sum, child) => sum + child.amount, 0);
  const childGap = node.amount - childSum;
  const displayedSources = amountSources(node);
  const displayedSource = displayedSources[0];
  const omittedLabels = (meta.omitted ?? []).map((o) => o.label).join(", ");
  const isPrinted = node.basis.includes("printed");
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
  // that is what the tile said; the printed row label stays visible below it.
  const heading = node.entity?.name ?? node.label;
  const printedAs =
    node.entity && node.entity.name !== node.label ? node.label : null;
  const explanation = unitExplanation(node);

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
          {/* Total */}
          <div>
            <span className="text-sm font-normal tracking-wide text-gray-600 uppercase">
              Expenditure {meta.fiscalYear}
            </span>
            <BudgetAmount
              amount={node.amount}
              sources={displayedSources}
              className="text-2xl font-bold text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              {shareOfTotal.toFixed(1)}% of {formatBudget(meta.total)} —{" "}
              {meta.stream === "pko"
                ? "all missions in this corpus"
                : meta.stream === "trust_funds"
                  ? "mapped individual trust funds"
                  : "the whole programme budget"}
              {parent && parent.tier !== "whole" && (
                <>
                  {" · "}
                  {((node.amount / parent.amount) * 100).toFixed(1)}% of{" "}
                  {parent.label}
                </>
              )}
            </p>
          </div>

          {/* Funding sources (programme budget only) */}
          {fundingEntries.length > 0 && (
            <div>
              <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
                By funding source
              </h3>
              <div className="space-y-2">
                {fundingEntries
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, amount]) => {
                    const style = FUNDING_SOURCES[key];
                    const label =
                      meta.fundingLabels?.[key] ?? style?.label ?? key;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${style?.color ?? "bg-gray-400"}`}
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
              {Math.abs(fundingGap) > 1000 && (
                <p className="mt-2 text-xs text-gray-500">
                  These sources add to {formatBudget(fundingSum)},{" "}
                  {formatBudget(Math.abs(fundingGap))}{" "}
                  {fundingGap > 0 ? "more than" : "less than"} the published
                  total.
                  {omittedLabels && (
                    <>
                      {" "}
                      The budget prints no combined total for {omittedLabels},
                      so that amount stays out of the total.
                    </>
                  )}
                </p>
              )}
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

          {/* Provenance */}
          <div>
            <h3 className="mb-2 text-lg font-normal tracking-wider text-gray-900 uppercase">
              Where this number comes from
            </h3>
            <p className="text-sm leading-relaxed text-gray-700">
              {meta.sourceKind === "audited"
                ? "This amount is aggregated from rows in the audited Secretariat expenditure extract."
                : meta.sourceKind === "trust_fund_schedule"
                  ? node.tier === "detail"
                    ? "This current-period expense is printed for the individual trust fund in the annual schedule."
                    : "This amount is the sum of current-period trust-fund expenses assigned to this entity by the reconstructed crosswalk."
                  : isPrinted
                    ? "This amount is printed in the budget document."
                    : "This amount is not printed as one figure. It is the sum of the lines below it."}
            </p>
            {printedAs && (
              <p className="mt-1 text-sm text-gray-700">
                The document prints the row as “{printedAs}”.
              </p>
            )}
            {explanation && (
              <p className="mt-1 text-sm text-gray-700">{explanation}</p>
            )}
            {node.tier === "section" && node.entityNote && (
              <p className="mt-1 text-sm text-gray-700">{node.entityNote}</p>
            )}
            {node.entity && (
              <p className="mt-1 text-sm text-gray-700">
                Attributed to {node.entity.name}
                {node.entity.acronym ? ` (${node.entity.acronym})` : ""}:{" "}
                {ENTITY_RELATIONSHIP_NOTES[node.entity.relationship] ??
                  node.entity.relationship}
                {node.entity.evidenceUrl && (
                  <>
                    {" — "}
                    <a
                      href={node.entity.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-un-blue hover:underline"
                    >
                      the paragraph it was read from
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
                .
              </p>
            )}
            {displayedSource && (
              <p className="mt-1 text-sm text-gray-700">
                Table row “{displayedSource.rowLabel}”, column “
                {displayedSource.columnHeader}”.
              </p>
            )}
            <a
              href={displayedSource?.url ?? meta.documentUrl ?? meta.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
            >
              {displayedSource?.symbol ??
                meta.documentSymbol ??
                "Source document"}
              {displayedSource?.pdfPage
                ? `, page ${displayedSource.pdfPage}`
                : ""}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-3 text-xs text-gray-500">
              {meta.sourceKind === "audited"
                ? "Prepared from the audited expenditure extract by "
                : meta.sourceKind === "trust_fund_schedule"
                  ? "Extracted from the audited individual trust-fund schedules by "
                  : "Extracted automatically from the budget documents by "}
              <a
                href={meta.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue hover:underline"
              >
                {meta.source.repo} {meta.source.release}
              </a>
              . Read the caveats before you quote a figure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
