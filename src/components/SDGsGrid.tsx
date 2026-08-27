"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import SDGModal from "./SDGModal";
import { YearSlider } from "@/components/YearSlider";
import { useDeepLink, replaceToSidebar, clearSidebarHash } from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClickHint } from "@/components/ui/ClickHint";
import { Switch } from "@/components/ui/switch";
import { formatBudget } from "@/lib/entities";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { SDG, SDGExpensesData, SDG_COLORS, SDG_SHORT_TITLES } from "@/lib/sdgs";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface Rect { x: number; y: number; width: number; height: number; }
interface TreemapItem { value: number; name: string; }

const GAP = 0.4; // Gap between entity cells (percentage)
const SDG_GAP = 0.8;
const ITEMS_PER_ROW = 6;

// Grid layout: equal square sizes, 6 per row.
// Positions are percentages of the container, so cellHeight must be scaled by
// the container's width/height for the tiles to paint as squares.
function gridLayout(
  items: TreemapItem[],
  containerAspect: number,
): (Rect & { data: TreemapItem })[] {
  if (items.length === 0 || !(containerAspect > 0)) return [];
  const numRows = Math.ceil(items.length / ITEMS_PER_ROW);
  const cols = Math.min(ITEMS_PER_ROW, items.length);
  const totalColGaps = (cols - 1) * SDG_GAP;
  const totalRowGaps = (numRows - 1) * SDG_GAP;

  let cellWidth = (100 - (ITEMS_PER_ROW - 1) * SDG_GAP) / ITEMS_PER_ROW;
  let cellHeight = cellWidth * containerAspect;
  const unscaledHeight = numRows * cellHeight + totalRowGaps;
  if (unscaledHeight > 100) {
    cellHeight = (100 - totalRowGaps) / numRows;
    cellWidth = cellHeight / containerAspect;
  }

  const gridWidth = cols * cellWidth + totalColGaps;
  const gridHeight = numRows * cellHeight + totalRowGaps;
  const xOffset = (100 - gridWidth) / 2;
  const yOffset = (100 - gridHeight) / 2;

  return items.map((item, i) => {
    const row = Math.floor(i / ITEMS_PER_ROW);
    const col = i % ITEMS_PER_ROW;
    return {
      x: xOffset + col * (cellWidth + SDG_GAP),
      y: yOffset + row * (cellHeight + SDG_GAP),
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
): (Rect & { data: TreemapItem })[] {
  if (items.length === 0) return [];
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) return gridLayout(items, containerAspect);

  const rows: TreemapItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_ROW) {
    rows.push(items.slice(i, i + ITEMS_PER_ROW));
  }
  const rowTotals = rows.map((row) => row.reduce((sum, item) => sum + item.value, 0));
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);
  const totalRowGaps = (rows.length - 1) * SDG_GAP;
  const availableHeight = 100 - totalRowGaps;

  const results: (Rect & { data: TreemapItem })[] = [];
  let currentY = 0;

  rows.forEach((row, rowIndex) => {
    const rowTotal = rowTotals[rowIndex];
    const rowHeight = (rowTotal / grandTotal) * availableHeight;
    const totalItemGaps = (row.length - 1) * SDG_GAP;
    const availableWidth = 100 - totalItemGaps;
    let currentX = 0;

    row.forEach((item) => {
      const itemWidth = (item.value / rowTotal) * availableWidth;
      results.push({ x: currentX, y: currentY, width: itemWidth, height: rowHeight, data: item });
      currentX += itemWidth + SDG_GAP;
    });
    currentY += rowHeight + SDG_GAP;
  });
  return results;
}

// Squarify for entity sub-treemaps
function squarify(items: TreemapItem[], x: number, y: number, width: number, height: number): (Rect & { data: TreemapItem })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];
  const normalized = items.map((item) => ({ ...item, normalizedValue: (item.value / total) * width * height }));
  return slice(normalized, x, y, width, height);
}

function slice(items: (TreemapItem & { normalizedValue: number })[], x: number, y: number, width: number, height: number): (Rect & { data: TreemapItem })[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, width, height, data: items[0] }];
  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);
  let sum = 0, splitIndex = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].normalizedValue;
    if (sum >= total / 2) { splitIndex = i + 1; break; }
  }
  splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1));
  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);
  const leftSum = leftItems.reduce((s, item) => s + item.normalizedValue, 0);

  if (width >= height) {
    const leftWidth = width * (leftSum / total) - GAP / 2;
    return [...slice(leftItems, x, y, leftWidth, height), ...slice(rightItems, x + leftWidth + GAP, y, width - leftWidth - GAP, height)];
  } else {
    const leftHeight = height * (leftSum / total) - GAP / 2;
    return [...slice(leftItems, x, y, width, leftHeight), ...slice(rightItems, x, y + leftHeight + GAP, width, height - leftHeight - GAP)];
  }
}

export default function SDGsGrid() {
  const yearRanges = useYearRanges();
  const SDG_YEARS = generateYearRange(yearRanges.sdgExpenses.min, yearRanges.sdgExpenses.max);

  const [sdgs, setSdgs] = useState<SDG[]>([]);
  const [selectedSDG, setSelectedSDG] = useState<SDG | null>(null);
  const [showSpending, setShowSpending] = useState<boolean>(false);
  const [showEntities, setShowEntities] = useState<boolean>(false); // Controls entity visibility
  const [bgFaded, setBgFaded] = useState<boolean>(false); // Background fades to light when entities visible
  const [hasScrollRevealed, setHasScrollRevealed] = useState<boolean>(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [containerAspect, setContainerAspect] = useState(0);
  const [expensesData, setExpensesData] = useState<SDGExpensesData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(yearRanges.sdgExpenses.default);

  // Sequence animations: entities and background fade in proper order
  useEffect(() => {
    if (showSpending) {
      // Going to spending: entities fade in immediately, bg fades after
      setShowEntities(true);
      const timer = setTimeout(() => setBgFaded(true), 800);
      return () => clearTimeout(timer);
    } else {
      // Going to grid: bg restores first (1400ms), then entities fade out
      setBgFaded(false);
      const timer = setTimeout(() => setShowEntities(false), 1400);
      return () => clearTimeout(timer);
    }
  }, [showSpending]);

  // Scroll-triggered reveal: transition when grid top reaches 40% from viewport top
  useEffect(() => {
    if (hasScrollRevealed) return;
    let ticking = false;
    const handleScroll = () => {
      if (ticking || !gridRef.current) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (gridRef.current && gridRef.current.getBoundingClientRect().top < window.innerHeight * 0.4) {
          setHasScrollRevealed(true);
          setShowSpending(true);
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrollRevealed]);

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
    if (pendingDeepLink && sdgs.length > 0) {
      const sdg = sdgs.find((s) => s.number === pendingDeepLink);
      if (sdg) setSelectedSDG(sdg);
      setPendingDeepLink(null);
    }
  }, [pendingDeepLink, sdgs, setPendingDeepLink]);

  useEffect(() => {
    fetch(`${basePath}/data/sdgs.json`).then((res) => res.json()).then(setSdgs);
  }, []);

  useEffect(() => {
    fetch(`${basePath}/data/sdg-expenses-${selectedYear}.json`).then((res) => res.json()).then(setExpensesData);
  }, [selectedYear]);

  const searchTerm = searchQuery.toLowerCase().trim();

  const matchesSDG = (sdgNumber: number): boolean => {
    if (!searchTerm) return true;
    if (sdgNumber.toString().includes(searchTerm)) return true;
    const shortTitle = SDG_SHORT_TITLES[sdgNumber];
    return shortTitle?.toLowerCase().includes(searchTerm) ?? false;
  };

  const filterEntities = (entities: { [entity: string]: number }): { [entity: string]: number } => {
    if (!searchTerm) return entities;
    return Object.fromEntries(Object.entries(entities).filter(([entity]) => entity.toLowerCase().includes(searchTerm)));
  };

  // Build filtered SDG data
  const filteredSDGData: { sdgNumber: number; total: number; entities: { [entity: string]: number } }[] = [];
  if (expensesData) {
    for (let i = 1; i <= 17; i++) {
      const data = expensesData[i.toString()];
      if (!data) continue;
      const sdgMatches = matchesSDG(i);
      if (sdgMatches) {
        filteredSDGData.push({ sdgNumber: i, total: data.total, entities: data.entities });
      } else {
        const filteredEntities = filterEntities(data.entities);
        const filteredTotal = Object.values(filteredEntities).reduce((sum, val) => sum + val, 0);
        if (filteredTotal > 0) {
          filteredSDGData.push({ sdgNumber: i, total: filteredTotal, entities: filteredEntities });
        }
      }
    }
  }

  const items: TreemapItem[] = filteredSDGData.map((d) => ({ name: d.sdgNumber.toString(), value: d.total }));
  const dataLookup = Object.fromEntries(filteredSDGData.map((d) => [d.sdgNumber.toString(), d]));

  useLayoutEffect(() => {
    const element = gridRef.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setContainerAspect(width / height);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [filteredSDGData.length]);

  const gridRects = gridLayout(items, containerAspect);
  const treemapRects = treemapLayout(items, containerAspect);
  const rects = showSpending ? treemapRects : gridRects;

  // Create lookup by SDG number for positions
  const positionLookup: Record<string, Rect> = {};
  rects.forEach((r) => { positionLookup[r.data.name] = r; });

  if (filteredSDGData.length === 0) {
    return (
      <>
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <ChartSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by SDG or entity..." />
            <div className="flex items-center gap-4">
              <YearSlider years={SDG_YEARS} selectedYear={selectedYear} onChange={setSelectedYear} />
              <div className="flex h-9 items-center gap-2">
                <span className={`text-sm ${!showSpending ? "font-medium text-gray-900" : "text-gray-500"}`}>Goals</span>
                <Switch checked={showSpending} onCheckedChange={setShowSpending} aria-label="Toggle between goals and spending" />
                <span className={`text-sm ${showSpending ? "font-medium text-gray-900" : "text-gray-500"}`}>Spending</span>
              </div>
            </div>
          </div>
        </div>
        <div
          ref={gridRef}
          className="flex h-[calc(100vh-320px)] min-h-[600px] w-full items-center justify-center bg-gray-100"
        >
          <p className="text-lg text-gray-500">No SDGs match the search criteria</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <ChartSearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by SDG or entity..." />
          <div className="flex items-center gap-4">
            <YearSlider years={SDG_YEARS} selectedYear={selectedYear} onChange={setSelectedYear} />
            <div className="flex h-9 items-center gap-2">
              <span className={`text-sm ${!showSpending ? "font-medium text-gray-900" : "text-gray-500"}`}>Goals</span>
              <Switch checked={showSpending} onCheckedChange={setShowSpending} aria-label="Toggle between goals and spending" />
              <span className={`text-sm ${showSpending ? "font-medium text-gray-900" : "text-gray-500"}`}>Spending</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={gridRef} className="relative h-[calc(100vh-320px)] min-h-[600px] w-full">
        {filteredSDGData.map((sdgData) => {
          const sdgNumber = sdgData.sdgNumber;
          const sdg = sdgs.find((s) => s.number === sdgNumber);
          const color = SDG_COLORS[sdgNumber];
          const shortTitle = SDG_SHORT_TITLES[sdgNumber];
          const pos = positionLookup[sdgNumber.toString()];
          if (!pos) return null;

          // Entity sub-treemap (render while visible OR fading out)
          const entityRects = (showSpending || showEntities)
            ? squarify(
                Object.entries(sdgData.entities).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
                0, 0, 100, 100
              )
            : [];

          return (
            <Tooltip key={sdgNumber} delayDuration={50}>
              <TooltipTrigger asChild>
                <div
                  className="absolute cursor-pointer overflow-hidden text-white transition-all ease-in-out hover:brightness-110 hover:ring-2 hover:ring-white/60"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: `${pos.width}%`,
                    height: `${pos.height}%`,
                    backgroundColor: bgFaded ? "#e5e7eb" : color,
                    transitionDuration: "1400ms",
                  }}
                  onClick={() => {
                    if (sdg) {
                      setSelectedSDG(sdg);
                      replaceToSidebar("sdg", sdg.number);
                    }
                  }}
                >
                  {/* Entity sub-treemap with fade */}
                  <div
                    className="absolute inset-0 transition-opacity"
                    style={{ opacity: showEntities ? 1 : 0, transitionDuration: "1000ms" }}
                  >
                    {entityRects.map((rect, i) => (
                      <div
                        key={`${sdgNumber}-entity-${i}`}
                        className="absolute"
                        style={{
                          left: `${rect.x}%`,
                          top: `${rect.y}%`,
                          width: `${rect.width}%`,
                          height: `${rect.height}%`,
                          backgroundColor: color,
                        }}
                      >
                        {rect.width > 3 && rect.height > 2 && (
                          <div className="flex h-full items-end overflow-hidden p-1">
                            <div className="truncate text-xs font-medium leading-tight">{rect.data.name}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* SDG label - full cell in grid mode, corner overlay in spending mode */}
                  <div
                    className="absolute z-10 flex transition-all"
                    style={{
                      left: 0,
                      top: 0,
                      padding: showSpending ? "0.5rem" : "1rem",
                      backgroundColor: showSpending ? color : "transparent",
                      transitionDuration: "1400ms",
                    }}
                  >
                    <span className="mr-2 flex-shrink-0 text-2xl font-bold leading-none sm:text-3xl">{sdgNumber}</span>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-left text-xs font-semibold leading-tight sm:text-sm">{shortTitle}</span>
                      <span
                        className="mt-0.5 text-xs opacity-90 transition-opacity sm:text-sm"
                        style={{ opacity: showSpending ? 1 : 0, transitionDuration: "600ms" }}
                      >
                        {formatBudget(sdgData.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg sm:max-w-sm">
                <div className="max-w-xs p-1 text-center sm:max-w-sm">
                  <p className="text-sm font-bold leading-tight sm:text-base">SDG {sdgNumber}: {shortTitle}</p>
                  {sdg && <p className="mt-1 text-xs leading-tight text-slate-600 sm:text-sm">{sdg.title}</p>}
                  <p className="mt-1 text-xs font-semibold text-slate-600">{formatBudget(sdgData.total)}</p>
                  <ClickHint />
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {selectedSDG && (
        <SDGModal
          sdg={selectedSDG}
          onClose={() => {
            setSelectedSDG(null);
            clearSidebarHash();
          }}
          color={SDG_COLORS[selectedSDG.number]}
          entityExpenses={expensesData?.[selectedSDG.number.toString()]?.entities}
          initialYear={selectedYear}
        />
      )}
    </>
  );
}
