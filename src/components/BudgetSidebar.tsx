"use client";

import { ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BudgetMeta, BudgetNode } from "@/types";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ShareButton } from "@/components/ShareButton";
import {
  ENTITY_RELATIONSHIP_NOTES,
  FUNDING_SOURCES,
  unitExplanation,
} from "@/lib/budgetGroupings";

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
  // One quantitative scale for the entire expanded subtree. A nested row's
  // neutral reference is its parent on that same scale, so both absolute size
  // and the child's share of its parent remain visible.
  const commonMaximum =
    scaleMaximum ?? maximumHierarchyAmount(nodes, childrenByParent);
  const referenceAmount = parentAmount ?? commonMaximum;
  const scaledWidth = (amount: number) =>
    commonMaximum > 0
      ? Math.min(100, Math.max(0, (amount / commonMaximum) * 100))
      : 0;

  return (
    <ul
      className={
        depth === 0
          ? "space-y-2"
          : "mt-2 ml-3 space-y-2 border-l border-gray-200 pl-3"
      }
    >
      {nodes.map((child) => {
        const descendants = childrenByParent[child.id] ?? [];
        return (
          <li key={child.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 text-gray-700">
                {KIND_NAMES[child.kind] && (
                  <span className="mr-1.5 text-[10px] tracking-wide text-gray-400 uppercase">
                    {KIND_NAMES[child.kind]}
                  </span>
                )}
                {child.entity?.name ?? child.label}
              </span>
              <span className="shrink-0 text-gray-900">
                {formatBudget(child.amount)}
              </span>
            </div>
            <div className="relative mt-0.5 h-1.5 w-full">
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-gray-100"
                style={{
                  width: `${scaledWidth(referenceAmount)}%`,
                }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-un-blue"
                style={{ width: `${scaledWidth(child.amount)}%` }}
              />
            </div>
            {descendants.length > 0 && (
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
            <p className="text-2xl font-bold text-gray-900">
              {formatBudget(node.amount)}
            </p>
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
                        <span className="text-gray-900">
                          {formatBudget(amount)}
                        </span>
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

          {/* Children */}
          {childNodes.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-normal tracking-wider text-gray-900 uppercase">
                Budget hierarchy
              </h3>
              <BudgetHierarchy
                nodes={childNodes}
                childrenByParent={childrenByParent}
              />
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
            {node.source && (
              <p className="mt-1 text-sm text-gray-700">
                Table row “{node.source.rowLabel}”, column “
                {node.source.columnHeader}”.
              </p>
            )}
            <a
              href={node.source?.url ?? meta.documentUrl ?? meta.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
            >
              {node.source?.symbol ?? meta.documentSymbol ?? "Source document"}
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
