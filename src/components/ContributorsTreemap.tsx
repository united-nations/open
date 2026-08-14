"use client";

import { useEffect, useState } from "react";
import { ContributorSidebar } from "@/components/ContributorSidebar";
import { YearSlider } from "@/components/YearSlider";
import { useDeepLink, replaceToSidebar, clearSidebarHash } from "@/hooks/useDeepLink";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClickHint } from "@/components/ui/ClickHint";
import {
  CATEGORY_LABELS,
  CONTRIBUTION_TYPES,
  Contributor,
  ContributorData,
  formatBudget,
  getContributionTypeColor,
  getContributionTypeOrder,
  getDisplayName,
  getStatusStyle,
  getTotalContributions,
  isGovernmentDonor,
  isUnattributed,
} from "@/lib/contributors";
import { FINANCING_INSTRUMENT_TOOLTIPS, getFinancingInstrumentColor } from "@/lib/financingInstruments";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TreemapItem {
  value: number;
  data: Contributor;
}

interface ContributionBreakdown {
  [key: string]: number;
}

const getContributionBreakdown = (
  contributions: Record<string, Record<string, number>>
): ContributionBreakdown => {
  const breakdown: ContributionBreakdown = {};
  Object.values(contributions).forEach((entityContribs) => {
    Object.entries(entityContribs).forEach(([type, amount]) => {
      breakdown[type] = (breakdown[type] || 0) + amount;
    });
  });
  return breakdown;
};

const DEFAULT_GAP = 0.4;

interface GapConfig {
  horizontal: number; // Gap for vertical splits (vertical lines between tiles)
  vertical: number;   // Gap for horizontal splits (horizontal lines between tiles)
}

function squarify(
  items: TreemapItem[],
  x: number,
  y: number,
  width: number,
  height: number,
  gap: number | GapConfig = DEFAULT_GAP
): (Rect & { data: Contributor })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  const gapConfig: GapConfig = typeof gap === 'number' 
    ? { horizontal: gap, vertical: gap } 
    : gap;

  return slice(normalized, x, y, width, height, gapConfig);
}

function slice(
  items: (TreemapItem & { normalizedValue: number })[],
  x: number,
  y: number,
  width: number,
  height: number,
  gap: GapConfig
): (Rect & { data: Contributor })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }];
  }

  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);

  let sum = 0;
  let splitIndex = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].normalizedValue;
    if (sum >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1));

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);

  const leftSum = leftItems.reduce(
    (sum, item) => sum + item.normalizedValue,
    0
  );

  if (width > height) {
    // Vertical split - creates vertical gap lines (use horizontal gap)
    // Only when clearly wider than tall
    const g = gap.horizontal;
    const leftWidth = width * (leftSum / total) - g / 2;
    return [
      ...slice(leftItems, x, y, leftWidth, height, gap),
      ...slice(
        rightItems,
        x + leftWidth + g,
        y,
        width - leftWidth - g,
        height,
        gap
      ),
    ];
  } else {
    // Horizontal split - creates horizontal gap lines (use vertical gap)
    // Preferred when square or taller than wide - puts largest items at top
    const g = gap.vertical;
    const leftHeight = height * (leftSum / total) - g / 2;
    return [
      ...slice(leftItems, x, y, width, leftHeight, gap),
      ...slice(
        rightItems,
        x,
        y + leftHeight + g,
        width,
        height - leftHeight - g,
        gap
      ),
    ];
  }
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function ContributorsTreemap() {
  const yearRanges = useYearRanges();
  const DONOR_YEARS = generateYearRange(yearRanges.donors.min, yearRanges.donors.max);

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedContributor, setSelectedContributor] =
    useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(yearRanges.donors.default);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "donor",
    sectionId: "donors",
    onNavigateAway: () => setSelectedContributor(null),
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && contributors.length > 0) {
      const contributor = contributors.find(c => c.name === pendingDeepLink);
      if (contributor) {
        setSelectedContributor(contributor);
      }
      setPendingDeepLink(null);
    }
  }, [loading, pendingDeepLink, contributors, setPendingDeepLink]);

  useEffect(() => {
    fetch(`${basePath}/data/donors-${selectedYear}.json`)
      .then((res) => res.json())
      .then((data: Record<string, ContributorData>) => {
        const parsed = Object.entries(data).map(([name, info]) => ({
          name,
          status: info.status,
          category: info.category || (isGovernmentDonor(info.status) ? "Government" : "Non-Government"),
          contributions: info.contributions,
          payment_status: info.payment_status,
          is_other: info.is_other,
        }));
        setContributors(parsed);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load donors data:", err);
        setLoading(false);
      });
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex h-[780px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading contributors...</p>
      </div>
    );
  }

  // Filter contributors by search query
  const filteredContributors = searchQuery.trim()
    ? contributors.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contributors;

  // Split contributors into government, non-government, and unattributed groups
  const govItems: TreemapItem[] = filteredContributors
    .filter((c) => isGovernmentDonor(c.status) && !isUnattributed(c))
    .map((contributor) => ({
      value: getTotalContributions(contributor.contributions),
      data: contributor,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Unattributed is a special third category (not gov, not non-gov)
  const unattributedItems: TreemapItem[] = filteredContributors
    .filter((c) => isUnattributed(c))
    .map((contributor) => ({
      value: getTotalContributions(contributor.contributions),
      data: contributor,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Non-gov excludes Unattributed
  const orgContributors = filteredContributors.filter((c) => !isGovernmentDonor(c.status) && !isUnattributed(c));
  
  // Group non-gov by category
  const orgByCategory = orgContributors.reduce((acc, c) => {
    const cat = c.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {} as Record<string, Contributor[]>);

  // Convert to category items with totals
  const categoryItems = Object.entries(orgByCategory)
    .map(([category, contributors]) => {
      const items: TreemapItem[] = contributors
        .map((c) => ({ value: getTotalContributions(c.contributions), data: c }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
      const total = items.reduce((sum, item) => sum + item.value, 0);
      return { category, items, total };
    })
    .filter((cat) => cat.total > 0)
    .sort((a, b) => b.total - a.total);

  const orgItems = categoryItems.flatMap((cat) => cat.items);
  const allItems = [...govItems, ...orgItems, ...unattributedItems];

  if (allItems.length === 0) {
    return (
      <div className="w-full">
        {/* Filter Controls */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <ChartSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search contributors..."
          />
          <YearSlider
            years={DONOR_YEARS}
            selectedYear={selectedYear}
            onChange={setSelectedYear}
          />
        </div>
        <div className="flex h-[780px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            {searchQuery.trim() ? "No contributors match your search" : "No contribution data available"}
          </p>
        </div>
      </div>
    );
  }

  // Calculate totals for proportional heights
  const govTotal = govItems.reduce((sum, item) => sum + item.value, 0);
  const orgTotal = orgItems.reduce((sum, item) => sum + item.value, 0);
  const unattributedTotal = unattributedItems.reduce((sum, item) => sum + item.value, 0);
  const grandTotal = govTotal + orgTotal + unattributedTotal;

  // Calculate height percentages (with gaps between sections)
  const sectionGap = 0.5;
  const numSections = (govTotal > 0 ? 1 : 0) + (orgTotal > 0 ? 1 : 0) + (unattributedTotal > 0 ? 1 : 0);
  const totalGapSpace = sectionGap * Math.max(0, numSections - 1);
  const availableHeight = 100 - totalGapSpace;
  
  const govHeightPct = grandTotal > 0 ? (govTotal / grandTotal) * availableHeight : 0;
  const orgHeightPct = grandTotal > 0 ? (orgTotal / grandTotal) * availableHeight : 0;
  const unattributedHeightPct = grandTotal > 0 ? (unattributedTotal / grandTotal) * availableHeight : 0;

  // Generate rects for each group (in their own 0-100 coordinate space)
  const govRects = govItems.length > 0 ? squarify(govItems, 0, 0, 100, 100, DEFAULT_GAP) : [];
  const unattributedRects = unattributedItems.length > 0 ? squarify(unattributedItems, 0, 0, 100, 100, DEFAULT_GAP) : [];
  
  // For org section: layout categories horizontally, then squarify within each
  const orgVerticalGap = orgHeightPct > 0 ? Math.min(DEFAULT_GAP * (100 / orgHeightPct), 1.5) : DEFAULT_GAP;
  const categoryGap = 0.6;
  const categoryRects: { category: string; x: number; width: number; rects: (Rect & { data: Contributor })[] }[] = [];
  
  if (categoryItems.length > 0) {
    let xOffset = 0;
    const totalCatValue = categoryItems.reduce((sum, cat) => sum + cat.total, 0);
    const availableWidth = 100 - categoryGap * (categoryItems.length - 1);
    
    categoryItems.forEach((cat, idx) => {
      const catWidth = (cat.total / totalCatValue) * availableWidth;
      const rects = squarify(cat.items, 0, 0, 100, 100, {
        horizontal: DEFAULT_GAP,
        vertical: orgVerticalGap,
      });
      categoryRects.push({ category: cat.category, x: xOffset, width: catWidth, rects });
      xOffset += catWidth + (idx < categoryItems.length - 1 ? categoryGap : 0);
    });
  }

  const renderContributor = (
    rect: Rect & { data: Contributor },
    i: number
  ) => {
    // Color based on individual contributor's status
    const styles = getStatusStyle(rect.data.status);
    const stateContributions = getTotalContributions(rect.data.contributions);
    const breakdown = getContributionBreakdown(rect.data.contributions);
    const isOrg = !isGovernmentDonor(rect.data.status);
    const isUnattr = isUnattributed(rect.data);
    const isOther = rect.data.is_other;
    
    // Determine if label should show based on size
    const showLabel = rect.width > 3 && rect.height > 2;
    const isHovered = hoveredState === rect.data.name;

    const breakdownEntries = Object.entries(breakdown).sort(
      (a, b) => getContributionTypeOrder(a[0]) - getContributionTypeOrder(b[0])
    );
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    // Determine background color class
    const bgColorClass = isUnattr ? "bg-gray-400" : styles.bgColor;
    const textColorClass = isUnattr ? "text-white" : styles.textColor;

    return (
      <Tooltip key={`${rect.data.name}-${i}`} delayDuration={50}>
        <TooltipTrigger asChild>
          <div
            data-state={rect.data.name}
            className="absolute cursor-pointer transition-[left,top,width,height] duration-[1400ms] ease-in-out hover:ring-2 hover:ring-white/60 hover:brightness-110"
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
              zIndex: isHovered ? 10 : 1,
            }}
            onClick={() => {
              setSelectedContributor(rect.data);
              replaceToSidebar("donor", rect.data.name);
            }}
            onMouseEnter={() => setHoveredState(rect.data.name)}
            onMouseLeave={() => setHoveredState(null)}
          >
            {/* For organizations/unattributed: solid color with opacity-60. For government: contribution type breakdown */}
            {isOrg || isUnattr ? (
              <div className={`h-full w-full ${bgColorClass} opacity-60`} />
            ) : (
              <div className="flex h-full w-full flex-col">
                {breakdownEntries.map(([type, amount], idx) => {
                  const percentage = (amount / total) * 100;
                  const opacity = getContributionTypeColor(type);
                  return (
                    <div
                      key={idx}
                      className={`${styles.bgColor} ${opacity}`}
                      style={{ height: `${percentage}%` }}
                    />
                  );
                })}
              </div>
            )}
            {/* Label overlay */}
            {showLabel && (
              <div
                className={`absolute inset-0 overflow-hidden p-1 ${textColorClass}`}
              >
                <div className="truncate text-xs font-medium leading-tight">
                  {getDisplayName(rect.data.name)}
                </div>
                <div className="truncate text-xs leading-tight opacity-90">
                  {formatBudget(stateContributions)}
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="max-w-xs border border-slate-200 bg-white text-slate-800 shadow-lg sm:max-w-sm"
          hideWhenDetached
          avoidCollisions={true}
          collisionPadding={12}
        >
          <div className="max-w-xs p-1 text-center sm:max-w-sm">
            <p className="text-xs font-medium leading-tight sm:text-sm">
              {rect.data.name}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <span className={`inline-block h-2 w-2 rounded-full ${bgColorClass}`} />
              {isUnattr 
                ? "Unattributed" 
                : isGovernmentDonor(rect.data.status)
                  ? styles.label  // Member State, Observer, etc.
                  : (CATEGORY_LABELS[rect.data.category] || rect.data.category || "Non-Government")}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {formatBudget(stateContributions)}
            </p>
            <ClickHint text={isOther ? "Click for breakdown" : "Click for details"} />
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="w-full">
      {/* Filter Controls */}
      <div className="mb-3 flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between">
        <ChartSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search contributors..."
        />

        {/* Year Slider */}
        <YearSlider
          years={DONOR_YEARS}
          selectedYear={selectedYear}
          onChange={setSelectedYear}
        />
      </div>

      <div className="relative h-[780px] w-full bg-gray-100">
        {/* Government donors section */}
        {govRects.length > 0 && (
          <div 
            className="absolute left-0 top-0 w-full"
            style={{ height: `${govHeightPct}%` }}
          >
            {govRects.map((rect, i) => renderContributor(rect, i))}
          </div>
        )}
        
        {/* Non-Government donors section - grouped by category */}
        {categoryRects.length > 0 && (
          <div 
            className="absolute left-0 w-full"
            style={{ 
              top: `${govHeightPct + (govTotal > 0 ? sectionGap : 0)}%`,
              height: `${orgHeightPct}%` 
            }}
          >
            {categoryRects.map((cat) => (
              <div
                key={cat.category}
                className="absolute top-0 h-full"
                style={{ left: `${cat.x}%`, width: `${cat.width}%` }}
              >
                {cat.rects.map((rect, i) => renderContributor(rect, i))}
              </div>
            ))}
          </div>
        )}

        {/* Unattributed section (third category) */}
        {unattributedRects.length > 0 && (
          <div 
            className="absolute left-0 w-full"
            style={{ 
              top: `${govHeightPct + (govTotal > 0 ? sectionGap : 0) + orgHeightPct + (orgTotal > 0 ? sectionGap : 0)}%`,
              height: `${unattributedHeightPct}%` 
            }}
          >
            {unattributedRects.map((rect, i) => renderContributor(rect, i))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        {/* Financing Instrument Legend (applies to government donors) */}
        <div className="flex flex-wrap gap-3">
          {CONTRIBUTION_TYPES.filter(t => t.type !== "Other").map(({ type, label }) => (
            <Tooltip key={type} delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getFinancingInstrumentColor(type) }} />
                  <span className="text-xs text-gray-600 underline decoration-dotted underline-offset-2">{label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                sideOffset={4}
                className="max-w-[250px] border border-slate-200 bg-white text-slate-800 shadow-lg"
              >
                <p className="text-xs">{FINANCING_INSTRUMENT_TOOLTIPS[type]}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        
        {/* Contributor Type Legend */}
        <div className="flex flex-wrap gap-3">
          {govTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-un-blue" />
              <span className="text-xs text-gray-600">Government</span>
            </div>
          )}
          {orgTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-smoky opacity-60" />
              <span className="text-xs text-gray-600">Non-Government</span>
            </div>
          )}
          {unattributedTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-gray-400 opacity-60" />
              <span className="text-xs text-gray-600">Unattributed</span>
            </div>
          )}
        </div>
      </div>

      {selectedContributor && (
        <ContributorSidebar
          contributor={selectedContributor}
          initialYear={selectedYear}
          onClose={() => {
            setSelectedContributor(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
