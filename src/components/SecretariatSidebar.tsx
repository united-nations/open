"use client";

import { ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Entity, SecretariatFund } from "@/types";
import { formatBudget } from "@/lib/entities";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ShareButton } from "@/components/ShareButton";

interface SecretariatSidebarProps {
  entity: string;
  /** Display metadata joined from entities.json (undefined for sub-entities not in it). */
  details?: Entity;
  funds: SecretariatFund[];
  year: number;
  onClose: () => void;
}

// Source-type colors (matches the three SOURCE_TYPE values in the data).
const SOURCE_COLORS: Record<string, string> = {
  "Regular assessed": "bg-un-blue",
  "Other Assessed": "bg-un-blue-slate",
  Voluntary: "bg-camouflage-green",
};
const sourceColor = (s: string) => SOURCE_COLORS[s] ?? "bg-gray-400";

export function SecretariatSidebar({ entity, details, funds, year, onClose }: SecretariatSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showAll, setShowAll] = useState(false);
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
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) handleClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const total = funds.reduce((s, f) => s + f.amount, 0);
  // Sort by amount desc; only positive amounts are drawn as bars.
  const sorted = [...funds].sort((a, b) => b.amount - a.amount);
  const displayed = showAll ? sorted : sorted.slice(0, 10);
  const maxAmount = sorted.length > 0 ? Math.max(...sorted.map((f) => f.amount)) : 0;

  // Source-type subtotals for the summary row.
  const bySource = funds.reduce<Record<string, number>>((acc, f) => {
    acc[f.source_type] = (acc[f.source_type] ?? 0) + f.amount;
    return acc;
  }, {});

  const titleId = "secretariat-sidebar-title";

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
        <div className="sticky top-0 z-10 border-b border-gray-300 bg-white px-6 pb-2 pt-4 sm:px-8 sm:pb-3 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 id={titleId} className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                {entity}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {details?.entity_long ?? "UN Secretariat sub-entity"} · {year}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton hash={`secretariat=${encodeURIComponent(entity)}`} />
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
        <div className="space-y-6 px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5">
          {/* Total */}
          <div>
            <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
              Total budget ({year})
            </span>
            <p className="text-2xl font-bold text-gray-900">{formatBudget(total)}</p>
            {/* Source-type subtotals */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([src, amt]) => (
                  <span key={src} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className={`inline-block h-2.5 w-2.5 rounded-sm ${sourceColor(src)}`} />
                    {src} {formatBudget(amt)}
                  </span>
                ))}
            </div>
          </div>

          {/* Description & link (when this sub-entity is in entities.json) */}
          {details?.entity_description && (
            <div>
              <span className="text-sm font-normal uppercase tracking-wide text-gray-600">
                Description
              </span>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-700">
                {details.entity_description}
              </p>
              {details.entity_link && (
                <a
                  href={details.entity_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
                >
                  Visit website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Trust funds / identifiers breakdown */}
          <div>
            <h3 className="mb-3 text-lg font-normal uppercase tracking-wider text-gray-900">
              Trust funds &amp; identifiers
            </h3>
            <p className="mb-3 text-xs text-gray-500">
              Voluntary contributions are itemized by trust fund; assessed amounts by budget
              identifier. Amounts ≤ 0 (corrections) are listed but not drawn as bars.
            </p>
            <div className="space-y-1.5">
              {displayed.map((f, i) => {
                const widthPct = maxAmount > 0 && f.amount > 0 ? (f.amount / maxAmount) * 100 : 0;
                return (
                  <div key={`${f.label}-${i}`} className="flex items-center gap-2">
                    <div className="w-40 flex-shrink-0 truncate text-left text-xs font-medium" title={f.label}>
                      {f.label}
                    </div>
                    <div className="flex flex-1 items-center">
                      <div
                        className={`h-2 rounded-sm ${sourceColor(f.source_type)}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="w-16 flex-shrink-0 text-right text-xs text-gray-500">
                      {formatBudget(f.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
            {sorted.length > 10 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 text-xs font-medium text-un-blue hover:underline"
              >
                {showAll ? "Show less" : `Show all ${sorted.length}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
