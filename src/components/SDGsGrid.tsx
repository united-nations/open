"use client";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import { TreemapLabel } from "@/components/charts/TreemapLabel";
import styles from "./SDGsGrid.module.css";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { DelayedChartLoading } from "@/components/DelayedChartLoading";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartFooter } from "@/components/ChartFooter";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import {
  TreemapTileInteractionCue,
  activateTreemapTileOnKeyDown,
  treemapTileFillInteractionClassName,
  treemapTileInteractionClassName,
  treemapTileLayoutTransitionClassName,
  treemapTileBaseBorderClassName,
} from "@un-eosg/ui/components/treemap-tile-interaction";
import { squarifyDense } from "@/lib/treemapLayout";

import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import SDGModal from "./SDGModal";
import { YearSlider } from "@/components/YearSlider";
import {
  useDeepLink,
  replaceToSidebar,
  clearSidebarHash,
} from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { formatBudget } from "@/lib/entities";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import {
  SDG,
  SDGExpensesData,
  SDG_COLORS,
  SDG_EXTRA_GROUPS,
  getSDGKey,
  getSDGLabel,
  getSDGColor,
} from "@/lib/sdgs";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface TreemapItem {
  value: number;
  name: string;
}

// Match the shared treemap's group gutter: 0.4% of plot height.
// Convert horizontal gaps by the aspect ratio to keep both axes equal in pixels.
const SDG_GAP = 0.4;
const SDG_LABEL_INSET = 1;
const SDG_TRANSITION_MS = 1400;
const ITEMS_PER_ROW = 6;

// Grid layout: equal square sizes, 6 per row.
// Positions are percentages of the container, so cellHeight must be scaled by
// the container's width/height for the tiles to paint as squares.
function gridLayout(
  items: TreemapItem[],
  containerAspect: number,
): (Rect & { data: TreemapItem })[] {
  if (items.length === 0 || !(containerAspect > 0)) return [];
  const columnGap = SDG_GAP / containerAspect;
  const numRows = Math.ceil(items.length / ITEMS_PER_ROW);
  const cols = Math.min(ITEMS_PER_ROW, items.length);
  const totalColGaps = (cols - 1) * columnGap;
  const totalRowGaps = (numRows - 1) * SDG_GAP;

  let cellWidth = (100 - (ITEMS_PER_ROW - 1) * columnGap) / ITEMS_PER_ROW;
  let cellHeight = cellWidth * containerAspect;
  const unscaledHeight = numRows * cellHeight + totalRowGaps;
  if (unscaledHeight > 100) {
    cellHeight = (100 - totalRowGaps) / numRows;
    cellWidth = cellHeight / containerAspect;
  }

  const gridWidth = cols * cellWidth + totalColGaps;
  const xOffset = (100 - gridWidth) / 2;

  return items.map((item, i) => {
    const row = Math.floor(i / ITEMS_PER_ROW);
    const col = i % ITEMS_PER_ROW;
    return {
      x: xOffset + col * (cellWidth + columnGap),
      y: row * (cellHeight + SDG_GAP),
      width: cellWidth,
      height: cellHeight,
      data: item,
    };
  });
}

// Treemap layout: sizes proportional to value
function treemapLayout(
  items: TreemapItem[],
  containerAspect: number,
  height = 100,
): (Rect & { data: TreemapItem })[] {
  if (items.length === 0 || !(containerAspect > 0)) return [];
  const columnGap = SDG_GAP / containerAspect;
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) return gridLayout(items, containerAspect);

  const rows: TreemapItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_ROW) {
    rows.push(items.slice(i, i + ITEMS_PER_ROW));
  }
  const rowTotals = rows.map((row) =>
    row.reduce((sum, item) => sum + item.value, 0),
  );
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);
  const totalRowGaps = (rows.length - 1) * SDG_GAP;
  const availableHeight = height - totalRowGaps;

  const results: (Rect & { data: TreemapItem })[] = [];
  let currentY = 0;

  rows.forEach((row, rowIndex) => {
    const rowTotal = rowTotals[rowIndex];
    const rowHeight = (rowTotal / grandTotal) * availableHeight;
    const totalItemGaps = (row.length - 1) * columnGap;
    const availableWidth = 100 - totalItemGaps;
    let currentX = 0;

    row.forEach((item) => {
      const itemWidth = (item.value / rowTotal) * availableWidth;
      results.push({
        x: currentX,
        y: currentY,
        width: itemWidth,
        height: rowHeight,
        data: item,
      });
      currentX += itemWidth + columnGap;
    });
    currentY += rowHeight + SDG_GAP;
  });
  return results;
}

export default function SDGsGrid({
  treemapOnly = false,
}: {
  treemapOnly?: boolean;
}) {
  const yearRanges = useYearRanges();
  const SDG_YEARS = generateYearRange(
    yearRanges.sdgExpenses.min,
    yearRanges.sdgExpenses.max,
  );

  const [sdgs, setSdgs] = useState<SDG[]>([]);
  const [selectedSDG, setSelectedSDG] = useState<SDG | null>(null);
  const [showSpending, setShowSpending] = useState<boolean>(treemapOnly);
  const [hasScrollRevealed, setHasScrollRevealed] = useState<boolean>(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerAspect =
    containerSize.height > 0 ? containerSize.width / containerSize.height : 0;
  const [expensesData, setExpensesData] = useState<SDGExpensesData | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadedYear, setLoadedYear] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    yearRanges.sdgExpenses.default,
  );

  // Derive the immediate phase; only the delayed transition needs state.
  const [settledSpending, setSettledSpending] = useState(treemapOnly);
  const showEntities = showSpending || settledSpending;
  useEffect(() => {
    const timer = setTimeout(
      () => setSettledSpending(showSpending),
      showSpending ? 800 : SDG_TRANSITION_MS,
    );
    return () => clearTimeout(timer);
  }, [showSpending]);

  // Scroll-triggered reveal: transition when grid top reaches 40% from viewport top
  useEffect(() => {
    if (treemapOnly || hasScrollRevealed) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking || !gridRef.current) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (
          gridRef.current &&
          gridRef.current.getBoundingClientRect().top < window.innerHeight * 0.4
        ) {
          setHasScrollRevealed(true);
          setShowSpending(true);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasScrollRevealed, treemapOnly]);

  const parseSDGNumber = useCallback((value: string) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }, []);

  const [pendingDeepLink, setPendingDeepLink] = useDeepLink<number | null>({
    hashPrefix: "sdg",
    sectionId: "sdgs",
    transform: parseSDGNumber,
    onNavigateAway: () => setSelectedSDG(null),
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (pendingDeepLink && sdgs.length > 0) {
        const requestedYear = Number(
          new URLSearchParams(window.location.search).get("year"),
        );
        if (yearRanges.sdgExpenses.years.includes(requestedYear)) {
          if (selectedYear !== requestedYear) {
            setSelectedYear(requestedYear);
            return;
          }
          if (loadedYear !== requestedYear) return;
        }
        const sdg = sdgs.find((s) => s.number === pendingDeepLink);
        if (sdg) setSelectedSDG(sdg);
        setPendingDeepLink(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    pendingDeepLink,
    sdgs,
    setPendingDeepLink,
    selectedYear,
    loadedYear,
    yearRanges.sdgExpenses.years,
  ]);

  useEffect(() => {
    fetch(`${basePath}/data/sdgs.json`)
      .then((res) => res.json())
      .then(setSdgs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${basePath}/data/sdg-expenses-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: SDGExpensesData) => {
        if (cancelled) return;
        setExpensesData(data);
        setLoadedYear(selectedYear);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const searchTerm = searchQuery.toLowerCase().trim();

  const matchesSDG = (sdgNumber: number): boolean => {
    if (!searchTerm) return true;
    if (sdgNumber.toString().includes(searchTerm)) return true;
    const shortTitle = getSDGLabel(sdgNumber);
    return shortTitle?.toLowerCase().includes(searchTerm) ?? false;
  };

  const filterEntities = (entities: {
    [entity: string]: number;
  }): { [entity: string]: number } => {
    if (!searchTerm) return entities;
    return Object.fromEntries(
      Object.entries(entities).filter(([entity]) =>
        entity.toLowerCase().includes(searchTerm),
      ),
    );
  };

  // Build filtered SDG data
  const filteredSDGData: {
    sdgNumber: number;
    total: number;
    entities: { [entity: string]: number };
  }[] = [];
  if (expensesData) {
    for (const i of [...Array.from({ length: 17 }, (_, n) => n + 1), 0, -1]) {
      const data = expensesData[getSDGKey(i)];
      if (!data) continue;
      const sdgMatches = matchesSDG(i);
      if (sdgMatches) {
        filteredSDGData.push({
          sdgNumber: i,
          total: data.total,
          entities: data.entities,
        });
      } else {
        const filteredEntities = filterEntities(data.entities);
        const filteredTotal = Object.values(filteredEntities).reduce(
          (sum, val) => sum + val,
          0,
        );
        if (Object.keys(filteredEntities).length > 0) {
          filteredSDGData.push({
            sdgNumber: i,
            total: filteredTotal,
            entities: filteredEntities,
          });
        }
      }
    }
  }

  // Both totals include Non-SDG and Not specified; only the money view draws them.
  const visibleSDGData = filteredSDGData.filter(
    (row) => showSpending || row.sdgNumber > 0,
  );
  const items: TreemapItem[] = filteredSDGData
    .filter((d) => d.total > 0)
    .map((d) => ({
      name: d.sdgNumber.toString(),
      value: d.total,
    }));

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0)
        setContainerSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visibleSDGData.length]);

  const allocatedItems = items.filter((item) => Number(item.name) > 0);
  const remainderItems = items.filter((item) => Number(item.name) <= 0);
  const gridRects = gridLayout(allocatedItems, containerAspect);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const gapCount =
    Math.max(0, remainderItems.length - 1) +
    (allocatedItems.length && remainderItems.length ? 1 : 0);
  const availableHeight = 100 - gapCount * SDG_GAP;
  const allocatedHeight = total
    ? (availableHeight *
        allocatedItems.reduce((sum, item) => sum + item.value, 0)) /
      total
    : 0;
  const treemapRects = treemapLayout(
    allocatedItems,
    containerAspect,
    allocatedHeight,
  );
  let nextY =
    allocatedHeight +
    (allocatedItems.length && remainderItems.length ? SDG_GAP : 0);
  for (const item of remainderItems) {
    const height = (availableHeight * item.value) / total;
    treemapRects.push({ x: 0, y: nextY, width: 100, height, data: item });
    nextY += height + SDG_GAP;
  }
  const rects = showSpending ? treemapRects : gridRects;

  // Create lookup by SDG number for positions
  const positionLookup: Record<string, Rect> = {};
  rects.forEach((r) => {
    positionLookup[r.data.name] = r;
  });
  // Keep both non-goal groups mounted for the full bidirectional transition.
  if (!showSpending) {
    for (const item of remainderItems) {
      positionLookup[item.name] = { x: 0, y: 100, width: 100, height: 0 };
    }
  }

  if (visibleSDGData.length === 0) {
    return (
      <>
        <div className="mb-3">
          <ChartHeader
            yearControl={
              <YearSlider
                years={SDG_YEARS}
                selectedYear={selectedYear}
                onChange={setSelectedYear}
              />
            }
            controls={
              !treemapOnly && (
                <BinaryToggle
                  variant="segmented"
                  label="Goals view"
                  options={[
                    { value: "goals", label: "Goals" },
                    { value: "spending", label: "Expenditure" },
                  ]}
                  value={showSpending ? "spending" : "goals"}
                  onValueChange={(value) =>
                    setShowSpending(value === "spending")
                  }
                />
              )
            }
            search={
              <ChartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by SDG or entity..."
              />
            }
            summaries={[
              {
                key: "total",
                label: searchQuery ? "Matching total" : "Total",
                value: formatBudget(
                  filteredSDGData.reduce((sum, item) => sum + item.total, 0),
                ),
              },
            ]}
          />
        </div>
        <div
          ref={gridRef}
          className={`flex w-full items-center justify-center bg-gray-100 ${SYSTEM_TREEMAP_HEIGHT_CLASS}`}
        >
          <p className="text-lg text-gray-500">
            No SDGs match the search criteria
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ChartFrame
        className="relative"
        header={
          <ChartHeader
            yearControl={
              <YearSlider
                years={SDG_YEARS}
                selectedYear={selectedYear}
                onChange={setSelectedYear}
              />
            }
            controls={
              !treemapOnly && (
                <BinaryToggle
                  variant="segmented"
                  label="Goals view"
                  options={[
                    { value: "goals", label: "Goals" },
                    { value: "spending", label: "Expenditure" },
                  ]}
                  value={showSpending ? "spending" : "goals"}
                  onValueChange={(value) =>
                    setShowSpending(value === "spending")
                  }
                />
              )
            }
            search={
              <ChartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by SDG or entity..."
              />
            }
            summaries={[
              {
                key: "total",
                label: searchQuery ? "Matching total" : "Total",
                value: formatBudget(
                  filteredSDGData.reduce((sum, item) => sum + item.total, 0),
                ),
              },
            ]}
          />
        }
        footer={
          <ChartFooter
            hint="Click on an SDG to explore details"
            signedAmounts={filteredSDGData.flatMap((row) =>
              Object.entries(row.entities).map(([label, amount]) => ({
                group:
                  row.sdgNumber <= 0
                    ? getSDGLabel(row.sdgNumber)
                    : `SDG ${row.sdgNumber}`,
                label,
                amount,
              })),
            )}
            details={
              showSpending ? (
                <p>
                  Only reported actual expenditure is included; budget figures
                  are excluded. Non-SDG preserves CEB&apos;s reported x00
                  amounts. Not specified is the remaining entity expenditure
                  after reported allocations to SDGs 1–17 and Non-SDG. It
                  includes missing SDG reporting and signed reconciliation
                  differences, and does not establish that the expenditure is
                  unrelated to the SDGs.
                </p>
              ) : undefined
            }
          />
        }
      >
        <DelayedChartLoading
          pending={loadedYear !== selectedYear}
          requestKey={selectedYear}
        />
        <div
          ref={gridRef}
          className={`relative w-full ${SYSTEM_TREEMAP_HEIGHT_CLASS}`}
        >
          {filteredSDGData.map((sdgData) => {
            const sdgNumber = sdgData.sdgNumber;
            const sdg = sdgs.find((s) => s.number === sdgNumber);
            const color = getSDGColor(sdgNumber);
            const shortTitle = getSDGLabel(sdgNumber);
            const pos = positionLookup[sdgNumber.toString()];
            if (!pos) return null;
            const activate = sdg
              ? () => {
                  setSelectedSDG(sdg);
                  replaceToSidebar("sdg", sdg.number);
                }
              : undefined;

            // Entity sub-treemap (render while visible OR fading out)
            const entityRects =
              showSpending || showEntities
                ? squarifyDense(
                    Object.entries(sdgData.entities)
                      .filter(([, value]) => value > 0)
                      .map(([name, value]) => ({ value, data: { name } }))
                      .sort((a, b) => b.value - a.value),
                    0,
                    0,
                    100,
                    100,
                  )
                : [];

            return (
              <Tooltip key={sdgNumber} delayDuration={50}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute overflow-hidden text-white ${treemapTileLayoutTransitionClassName} ${activate ? treemapTileInteractionClassName : "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"}`}
                    role={activate ? "button" : undefined}
                    tabIndex={sdgNumber <= 0 && !showSpending ? -1 : 0}
                    aria-hidden={
                      sdgNumber <= 0 && !showSpending ? true : undefined
                    }
                    aria-label={
                      sdg ? `SDG ${sdgNumber}: ${shortTitle}` : shortTitle
                    }
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: `${pos.width}%`,
                      height: `${pos.height}%`,
                      transitionDuration: `${SDG_TRANSITION_MS}ms`,
                      pointerEvents:
                        sdgNumber <= 0 && !showSpending ? "none" : undefined,
                    }}
                    onClick={activate}
                    onKeyDown={
                      activate
                        ? (event) =>
                            activateTreemapTileOnKeyDown(event, activate)
                        : undefined
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 ${activate ? treemapTileFillInteractionClassName : "motion-safe:transition-[background-color] motion-reduce:transition-none"}`}
                      style={{
                        backgroundColor: color,
                        transitionDuration: `${SDG_TRANSITION_MS}ms,150ms`,
                      }}
                    />
                    {/* Entity sub-treemap with fade */}
                    <div
                      className="absolute inset-0 transition-opacity"
                      style={{
                        opacity: showEntities ? 1 : 0,
                        transitionDuration: "1000ms",
                      }}
                    >
                      {entityRects.map((rect, i) => (
                        <div
                          key={`${sdgNumber}-entity-${i}`}
                          className={styles.entityTile}
                          style={
                            {
                              "--tile-left": `${rect.x}%`,
                              "--tile-top": `${rect.y}%`,
                              "--tile-right": `${rect.x + rect.width}%`,
                              "--tile-bottom": `${rect.y + rect.height}%`,
                            } as React.CSSProperties
                          }
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-0 ${activate ? treemapTileFillInteractionClassName : ""}`}
                            style={{ backgroundColor: color }}
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.8)]"
                          />
                          <TreemapLabel
                            data-entity-label
                            minWidth={Math.max(40, containerSize.width * 0.04)}
                            minHeight={Math.max(
                              28,
                              containerSize.height * 0.03,
                            )}
                            className="relative z-[2] flex h-full items-end overflow-hidden p-1.5"
                          >
                            <div className="text-xs leading-tight font-medium whitespace-nowrap">
                              {rect.data.name}
                            </div>
                          </TreemapLabel>
                        </div>
                      ))}
                    </div>

                    {/* SDG label - full cell in grid mode, corner overlay in spending mode */}
                    <TreemapLabel
                      data-sdg-heading
                      fit={false}
                      className="absolute z-10 overflow-hidden transition-all"
                      style={{
                        left: showSpending ? SDG_LABEL_INSET : 0,
                        top: showSpending ? SDG_LABEL_INSET : 0,
                        maxWidth: showSpending
                          ? `max(0px, calc(100% - ${2 * SDG_LABEL_INSET}px))`
                          : undefined,
                        maxHeight: showSpending
                          ? `max(0px, calc(100% - ${2 * SDG_LABEL_INSET}px))`
                          : undefined,
                        transitionDuration: `${SDG_TRANSITION_MS}ms`,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 -z-10 ${activate ? treemapTileFillInteractionClassName : ""}`}
                        style={{
                          backgroundColor: showSpending ? color : "transparent",
                        }}
                      />
                      <div
                        className="flex"
                        style={{ padding: showSpending ? "0.5rem" : "1rem" }}
                      >
                        <span className="mr-2 flex-shrink-0 text-2xl leading-none font-bold sm:text-3xl">
                          {sdgNumber > 0 ? sdgNumber : ""}
                        </span>
                        <div className="flex flex-col pt-0.5">
                          <span className="text-left text-xs leading-tight font-semibold sm:text-sm">
                            {shortTitle}
                          </span>
                          <span
                            className="mt-0.5 text-xs opacity-90 transition-opacity sm:text-sm"
                            style={{
                              opacity: showSpending ? 1 : 0,
                              transitionDuration: "600ms",
                            }}
                          >
                            {formatBudget(sdgData.total)}
                          </span>
                        </div>
                      </div>
                    </TreemapLabel>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.8)] ${activate ? treemapTileBaseBorderClassName : ""}`}
                    />
                    {activate && <TreemapTileInteractionCue />}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg sm:max-w-sm"
                >
                  <FinancialTooltip
                    title={
                      sdgNumber <= 0
                        ? getSDGLabel(sdgNumber)
                        : `SDG ${sdgNumber}: ${shortTitle}`
                    }
                    context={
                      sdgNumber <= 0
                        ? SDG_EXTRA_GROUPS[sdgNumber].description
                        : sdg?.title
                    }
                    total={{
                      label: "Expenditure",
                      value: formatBudget(sdgData.total),
                    }}
                    actionHint={
                      sdgNumber <= 0 ? undefined : "Click to explore details"
                    }
                  />
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </ChartFrame>

      {selectedSDG && (
        <SDGModal
          sdg={selectedSDG}
          onClose={() => {
            setSelectedSDG(null);
            clearSidebarHash();
          }}
          color={SDG_COLORS[selectedSDG.number]}
          entityExpenses={
            expensesData?.[selectedSDG.number.toString()]?.entities
          }
          initialYear={selectedYear}
        />
      )}
    </>
  );
}
