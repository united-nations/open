"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ChartSearchInput } from "@/components/ui/chart-search-input";
import { Entity, BudgetEntry, EntityRevenue } from "@/types";
import { useDeepLink, replaceToSidebar, clearSidebarHash } from "@/hooks/useDeepLink";
import {
  systemGroupingStyles,
  getSystemGroupingStyle,
  getSortedSystemGroupings,
} from "@/lib/systemGroupings";
import { formatBudget } from "@/lib/entities";
import { EntitySidebar } from "@/components/EntitySidebar";
import { YearSlider } from "@/components/YearSlider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClickHint } from "@/components/ui/ClickHint";
import { FINANCING_INSTRUMENT_TOOLTIPS, getFinancingInstrumentColor } from "@/lib/financingInstruments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useYearRanges, generateYearRange } from "@/lib/useYearRanges";
import { squarify, layoutGroups, type TreemapItem as TreemapItemBase } from "@/lib/treemapLayout";

// Treemap layout extracted to a shared module (see src/lib/treemapLayout.ts).
type TreemapItem = TreemapItemBase<Entity>;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function EntitiesTreemap() {
  const yearRanges = useYearRanges();
  const SPENDING_YEARS = generateYearRange(yearRanges.entitySpending.min, yearRanges.entitySpending.max);
  const REVENUE_YEARS = generateYearRange(yearRanges.entityRevenue.min, yearRanges.entityRevenue.max);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [spendingData, setSpendingData] = useState<Record<string, number>>({});
  const [revenueData, setRevenueData] = useState<Record<string, EntityRevenue>>({});
  const [showRevenue, setShowRevenue] = useState(false);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroups, setActiveGroups] = useState<Set<string>>(
    new Set(Object.keys(systemGroupingStyles))
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [spendingYear, setSpendingYear] = useState<number>(yearRanges.entitySpending.default);
  const [revenueYear, setRevenueYear] = useState<number>(yearRanges.entityRevenue.default);
  const [pendingDeepLink, setPendingDeepLink] = useDeepLink({
    hashPrefix: "entity",
    sectionId: "entities",
    onNavigateAway: () => setSelectedEntity(null),
  });

  // Open sidebar when data is loaded and there's a pending deep link
  useEffect(() => {
    if (!loading && pendingDeepLink && entities.length > 0) {
      const entity = entities.find(e => e.entity === pendingDeepLink);
      if (entity) {
        setSelectedEntity(entity);
      }
      setPendingDeepLink(null);
    }
  }, [loading, pendingDeepLink, entities, setPendingDeepLink]);

  // Current year based on mode
  const currentYear = showRevenue ? revenueYear : spendingYear;
  const currentYears = showRevenue ? REVENUE_YEARS : SPENDING_YEARS;
  const setCurrentYear = showRevenue ? setRevenueYear : setSpendingYear;

  // Load static entities data once
  useEffect(() => {
    fetch(`${basePath}/data/entities.json`)
      .then((res) => res.json())
      .then((data: Entity[]) => setEntities(data))
      .catch((err) => console.error("Failed to load entities:", err));
  }, []);

  // Load spending data when spending year changes
  useEffect(() => {
    fetch(`${basePath}/data/entity-spending-${spendingYear}.json`)
      .then((res) => res.json())
      .then((spendingArray: BudgetEntry[]) => {
        const spendingLookup = spendingArray.reduce(
          (acc: Record<string, number>, entry: BudgetEntry) => {
            acc[entry.entity] = entry.amount;
            return acc;
          },
          {}
        );
        setSpendingData(spendingLookup);
        if (!showRevenue) setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load expenses data:", err);
        if (!showRevenue) setLoading(false);
      });
  }, [spendingYear, showRevenue]);

  // Load revenue data when revenue year changes
  useEffect(() => {
    fetch(`${basePath}/data/entity-revenue-${revenueYear}.json`)
      .then((res) => res.json())
      .then((revenueObj: Record<string, EntityRevenue>) => {
        setRevenueData(revenueObj);
        if (showRevenue) setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load revenue data:", err);
        if (showRevenue) setLoading(false);
      });
  }, [revenueYear, showRevenue]);

  // Synthetic entities for CEB aggregates (UN and UN-DPO)
  const syntheticUN: Entity = {
    entity: "UN",
    entity_long: "UN Secretariat (incl. Political Missions)",
    entity_combined: "UN Secretariat (incl. Political Missions)",
    entity_description: "Aggregate for the UN Secretariat including Special Political Missions. CEB reports this as a single entity. Excludes UNEP, UNODC, UN-Habitat, and ITC which report separately.",
    entity_link: "https://unsceb.org",
    entity_link_is_un_org: 1,
    system_grouping: "UN Secretariat",
    category: "CEB Aggregate",
    un_principal_organ: "General Assembly",
    un_pillar: null,
    is_ceb_member: true,
    head_of_entity_level: null,
    head_of_entity_title_specific: null,
    head_of_entity_title_general: null,
    head_of_entity_name: null,
    head_of_entity_bio: null,
    head_of_entity_headshot: null,
    global_leadership_team_url: null,
    on_display: "TRUE",
    foundational_mandate: null,
    organizational_chart_link: null,
    budget_financial_reporting_link: null,
    results_framework_link: null,
    strategic_plan_link: null,
    annual_reports_link: null,
    transparency_portal_link: null,
    socials_linkedin: null,
    socials_twitter: null,
    socials_instagram: null,
    entity_news_page: null,
    entity_branding_page: null,
    entity_data_page: null,
    entity_logo_page: null,
    entity_wikipedia_page: null,
  };

  const syntheticDPO: Entity = {
    entity: "UN-DPO",
    entity_long: "Peacekeeping Operations",
    entity_combined: "Peacekeeping Operations (UN-DPO)",
    entity_description: "Aggregate for UN Peacekeeping Operations. CEB reports all peacekeeping missions under this single entity.",
    entity_link: "https://peacekeeping.un.org",
    entity_link_is_un_org: 1,
    system_grouping: "Peacekeeping Operations",
    category: "CEB Aggregate",
    un_principal_organ: "Security Council",
    un_pillar: null,
    is_ceb_member: true,
    head_of_entity_level: null,
    head_of_entity_title_specific: null,
    head_of_entity_title_general: null,
    head_of_entity_name: null,
    head_of_entity_bio: null,
    head_of_entity_headshot: null,
    global_leadership_team_url: null,
    on_display: "TRUE",
    foundational_mandate: null,
    organizational_chart_link: null,
    budget_financial_reporting_link: null,
    results_framework_link: null,
    strategic_plan_link: null,
    annual_reports_link: null,
    transparency_portal_link: null,
    socials_linkedin: null,
    socials_twitter: null,
    socials_instagram: null,
    entity_news_page: null,
    entity_branding_page: null,
    entity_data_page: null,
    entity_logo_page: null,
    entity_wikipedia_page: null,
  };

  const syntheticEntities: Entity[] = [syntheticUN, syntheticDPO];

  // Get the appropriate budget data and entities based on toggle
  const budgetData = showRevenue 
    ? Object.fromEntries(Object.entries(revenueData).map(([k, v]) => [k, v.total]))
    : spendingData;

  // Check if current spending year has secretariat fusion (detailed breakdown)
  const isFusionYear = yearRanges.entitySpending.fusionYears?.includes(spendingYear) ?? false;

  // Use synthetic entities for UN/UN-DPO when showing CEB aggregates:
  // - Revenue mode: always (CEB only has aggregates for revenue)
  // - Expenses mode: non-fusion years (2011-2018, 2024) use CEB aggregates
  const useSyntheticEntities = showRevenue || !isFusionYear;

  const activeEntities = useSyntheticEntities
    ? [
        ...syntheticEntities.filter((e) => budgetData[e.entity]),
        ...entities.filter(
          (e) =>
            budgetData[e.entity] &&
            e.entity !== "UN" &&
            e.entity !== "UN-DPO"
        ),
      ]
    : entities.filter((e) => spendingData[e.entity] && spendingData[e.entity] > 0);

  const toggleGroup = (groupKey: string) => {
    setActiveGroups((prev) => {
      // If this group is the only active one, show all groups
      if (prev.size === 1 && prev.has(groupKey)) {
        return new Set(Object.keys(systemGroupingStyles));
      }
      // Otherwise, show only this group
      return new Set([groupKey]);
    });
  };

  const handleResetFilters = () => {
    setActiveGroups(new Set(Object.keys(systemGroupingStyles)));
  };

  // Get entities with budget > 0
  const entitiesWithBudget = activeEntities.filter(
    (entity) =>
      entity.entity &&
      entity.system_grouping &&
      budgetData[entity.entity] &&
      budgetData[entity.entity] > 0
  );

  // Count entities for each group
  const groupCounts = entitiesWithBudget.reduce(
    (acc, entity) => {
      acc[entity.system_grouping] = (acc[entity.system_grouping] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Check if all groups are active
  const allGroupsActive =
    activeGroups.size === Object.keys(systemGroupingStyles).length;

  // Get selected value for dropdown
  const getSelectedValue = () => {
    if (allGroupsActive) return "all";
    if (activeGroups.size === 1) return Array.from(activeGroups)[0];
    return "all";
  };

  const handleValueChange = (value: string) => {
    if (value === "all") {
      setActiveGroups(new Set(Object.keys(systemGroupingStyles)));
    } else {
      toggleGroup(value);
    }
  };

  // Get display text for current selection
  const getDisplayText = () => {
    if (allGroupsActive) {
      return (
        <div className="flex items-center gap-2">
          <div className="ml-2 h-4 w-4 flex-shrink-0 rounded bg-un-blue"></div>
          <span className="text-sm font-medium">
            All Groups ({entitiesWithBudget.length})
          </span>
        </div>
      );
    }

    if (activeGroups.size === 1) {
      const activeGroup = Array.from(activeGroups)[0];
      const styles = systemGroupingStyles[activeGroup];
      const count = groupCounts[activeGroup] || 0;
      return (
        <div className="flex items-center gap-2">
          <div
            className={`${styles.bgColor} ml-2 h-4 w-4 flex-shrink-0 rounded`}
          ></div>
          <span className="text-sm font-medium">
            {styles.label} ({count})
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="ml-2 h-4 w-4 flex-shrink-0 rounded bg-un-blue"></div>
        <span className="text-sm font-medium">
          All Groups ({entitiesWithBudget.length})
        </span>
      </div>
    );
  };

  // Check if filter reset is needed (search has its own clear in the input)
  const isFilterResetNeeded = !allGroupsActive;

  // Search function
  const searchEntities = (query: string, entityList: Entity[]) => {
    if (!query.trim()) return entityList;
    const searchTerm = query.toLowerCase();
    return entityList.filter(
      (entity) =>
        entity.entity?.toLowerCase().includes(searchTerm) ||
        entity.entity_long?.toLowerCase().includes(searchTerm)
    );
  };

  if (loading) {
    return (
      <div className="flex h-[650px] w-full items-center justify-center">
        <p className="text-lg text-gray-500">Loading entities...</p>
      </div>
    );
  }

  // Filter entities by active groups, budget > 0, and search
  const filteredEntities = searchEntities(searchQuery, entitiesWithBudget)
    .filter((entity) => activeGroups.has(entity.system_grouping));

  // Group entities by system_grouping
  const groups = filteredEntities.reduce(
    (acc, entity) => {
      const budget = budgetData[entity.entity] || 0;
      if (budget > 0) {
        if (!acc[entity.system_grouping]) {
          acc[entity.system_grouping] = [];
        }
        acc[entity.system_grouping].push({ value: budget, data: entity });
      }
      return acc;
    },
    {} as Record<string, TreemapItem[]>
  );

  const sortedGroups = Object.entries(groups).sort(([groupA], [groupB]) => {
    const orderA = getSystemGroupingStyle(groupA).order;
    const orderB = getSystemGroupingStyle(groupB).order;
    return orderA - orderB;
  });

  // Render filter controls inline (not as a function component to avoid focus loss)
  const filterControlsJSX = (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:items-end sm:gap-3">
          {/* Search Input */}
          <ChartSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search entities..."
          />

          {/* Filter Dropdown */}
          <div className="relative w-full sm:w-[280px]">
            <Select value={getSelectedValue()} onValueChange={handleValueChange}>
              <SelectTrigger
                className="h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm transition-all duration-300 ease-out hover:border-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <SelectValue asChild>
                  <span className="flex items-center transition-all duration-300 ease-out">
                    {getDisplayText()}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                className="w-full border-gray-300 bg-white sm:w-[280px]"
                position="popper"
                side="bottom"
                align="start"
                sideOffset={4}
              >
                <SelectItem value="all">
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="h-4 w-4 flex-shrink-0 rounded bg-un-blue"></div>
                    <span className="text-sm font-medium">
                      All Groups ({entitiesWithBudget.length})
                    </span>
                  </div>
                </SelectItem>

                {getSortedSystemGroupings().map(([group, styles]) => {
                  const count = groupCounts[group] || 0;
                  if (count === 0) return null;
                  return (
                    <SelectItem key={group} value={group}>
                      <div className="flex items-center gap-2 py-0.5">
                        <div
                          className={`${styles.bgColor} h-4 w-4 flex-shrink-0 rounded`}
                        ></div>
                        <span className="text-sm font-medium">
                          {styles.label} ({count})
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters Button */}
          {isFilterResetNeeded && (
            <button
              onClick={handleResetFilters}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-all duration-200 ease-out hover:bg-gray-400 hover:text-gray-100 focus:bg-gray-400 focus:text-gray-100 focus:outline-none"
              aria-label="Clear filters"
              title="Clear filters"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Year Slider */}
          <YearSlider
            years={currentYears}
            selectedYear={currentYear}
            onChange={setCurrentYear}
          />

          {/* Funding/Spending Toggle */}
          <div className="flex h-9 items-center gap-2">
            <span className={`text-sm ${showRevenue ? "font-medium text-gray-900" : "text-gray-500"}`}>
              Funding
            </span>
            <Switch
              checked={!showRevenue}
              onCheckedChange={(checked) => setShowRevenue(!checked)}
              aria-label="Toggle between funding and spending"
            />
            <span className={`text-sm ${!showRevenue ? "font-medium text-gray-900" : "text-gray-500"}`}>
              Spending
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (sortedGroups.length === 0) {
    return (
      <div className="w-full">
        {filterControlsJSX}
        <div className="flex h-[650px] w-full items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-500">
            No entities match the selected filters
          </p>
        </div>
      </div>
    );
  }

  // Group layout (full-width rows for big groups, nested corner block for small
  // ones) is shared with SecretariatTreemap via layoutGroups.
  const itemsByGroup = Object.fromEntries(sortedGroups);
  const groupRects = layoutGroups(
    sortedGroups.map(([key, items]) => ({
      key,
      total: items.reduce((s, item) => s + item.value, 0),
    }))
  );

  const renderEntities = (
    groupKey: string,
    items: TreemapItem[],
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const styles =
      systemGroupingStyles[groupKey] || getSystemGroupingStyle(groupKey);
    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    const rects = squarify(sortedItems, x, y, width, height);

    return rects.map((rect, i) => {
      const entityBudget = budgetData[rect.data.entity] || 0;
      const showLabel = rect.width > 3 && rect.height > 2;
      const isHovered = hoveredEntity === rect.data.entity;
      const entityGroupStyle = getSystemGroupingStyle(
        rect.data.system_grouping || ""
      );

      // Get revenue breakdown for bar chart display
      const entityRevenue = revenueData[rect.data.entity];
      const hasRevenueBreakdown = showRevenue && entityRevenue?.by_type;
      const revenueTypes = hasRevenueBreakdown
        ? Object.entries(entityRevenue.by_type).sort((a, b) => {
            const order = ["Assessed", "Voluntary un-earmarked", "Voluntary earmarked", "Other"];
            return order.indexOf(a[0]) - order.indexOf(b[0]);
          })
        : [];
      const revenueTotal = hasRevenueBreakdown
        ? Object.values(entityRevenue.by_type).reduce((sum, val) => sum + val, 0)
        : 0;

      // Get opacity for revenue type (using category color as base)
      const getRevenueTypeOpacity = (type: string): string => {
        if (type === "Assessed") return "opacity-100";
        if (type === "Voluntary un-earmarked") return "opacity-80";
        if (type === "Voluntary earmarked") return "opacity-60";
        return "opacity-40";
      };

      return (
        <Tooltip
          key={`${rect.data.entity}-${i}`}
          delayDuration={50}
          disableHoverableContent
        >
          <TooltipTrigger asChild>
            <div
              data-entity={rect.data.entity}
              className={`absolute cursor-pointer transition-[left,top,width,height] duration-[1400ms] ease-in-out hover:ring-2 hover:ring-white/60 hover:brightness-110 ${!hasRevenueBreakdown ? styles.bgColor : ""} ${styles.textColor}`}
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                opacity: isHovered ? 1 : 0.9,
                zIndex: isHovered ? 10 : 1,
              }}
              onClick={() => {
                setSelectedEntity(rect.data);
                replaceToSidebar("entity", rect.data.entity);
              }}
              onMouseEnter={() => setHoveredEntity(rect.data.entity)}
              onMouseLeave={() => setHoveredEntity(null)}
            >
              {/* Revenue type breakdown bars (revenue mode only) */}
              {hasRevenueBreakdown && (
                <div className="absolute inset-0 flex flex-col">
                  {revenueTypes.map(([type, amount], idx) => {
                    const percentage = (amount / revenueTotal) * 100;
                    return (
                      <div
                        key={idx}
                        className={`${styles.bgColor} ${getRevenueTypeOpacity(type)}`}
                        style={{ height: `${percentage}%` }}
                      />
                    );
                  })}
                </div>
              )}
              {/* Solid background for spending mode */}
              {!hasRevenueBreakdown && showRevenue && (
                <div className={`absolute inset-0 ${styles.bgColor}`} />
              )}
              {/* Label overlay */}
              {showLabel && (
                <div className="relative h-full overflow-hidden p-1">
                  <div className="truncate text-xs font-medium leading-tight">
                    {rect.data.entity === "UN" || rect.data.entity === "UN-DPO"
                      ? rect.data.entity_long
                      : rect.data.entity}
                  </div>
                  <div className="truncate text-xs leading-tight opacity-70 transition-opacity duration-300">
                    {formatBudget(entityBudget)}
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
                {rect.data.entity_long}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${entityGroupStyle.bgColor}`}
                />
                <span className="text-xs text-slate-500">
                  {entityGroupStyle.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {formatBudget(entityBudget)}
              </p>
              <ClickHint />
            </div>
          </TooltipContent>
        </Tooltip>
      );
    });
  };

  return (
    <div className="w-full">
      {filterControlsJSX}

      {/* Legend — above the treemap, so the colour key is read before the tiles */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        {/* Revenue Type Legend (only in revenue mode) */}
        {showRevenue && (
          <div className="flex flex-wrap gap-3">
            {[
              { type: "Assessed", label: "Assessed" },
              { type: "Voluntary un-earmarked", label: "Voluntary un-earmarked" },
              { type: "Voluntary earmarked", label: "Voluntary earmarked" },
            ].map(({ type, label }) => (
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
        )}

        {/* System Grouping Legend */}
        <div className="flex flex-wrap gap-3">
          {getSortedSystemGroupings()
            .filter(([group]) => {
              // In revenue mode, show "Peacekeeping Operations" instead of "Peacekeeping Operations and Political Missions"
              if (showRevenue) {
                return group !== "Peacekeeping Operations and Political Missions" && groupCounts[group] && groupCounts[group] > 0;
              }
              // In spending mode, show "Peacekeeping Operations and Political Missions" instead of "Peacekeeping Operations"
              return group !== "Peacekeeping Operations" && groupCounts[group] && groupCounts[group] > 0;
            })
            .map(([group, styles]) => (
              <div key={group} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm ${styles.bgColor}`} />
                <span className="text-xs text-gray-600">{styles.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Treemap */}
      <div className="relative h-[650px] w-full bg-gray-100">
        {groupRects.flatMap((gr) =>
          renderEntities(
            gr.key,
            itemsByGroup[gr.key] || [],
            gr.x,
            gr.y,
            gr.width,
            gr.height
          )
        )}
      </div>

      {selectedEntity && (
        <EntitySidebar
          entity={selectedEntity}
          spending={spendingData[selectedEntity.entity] || 0}
          revenue={revenueData[selectedEntity.entity] || null}
          initialYear={revenueYear}
          onClose={() => {
            setSelectedEntity(null);
            clearSidebarHash();
          }}
        />
      )}
    </div>
  );
}
