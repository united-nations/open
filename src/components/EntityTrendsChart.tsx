"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HierarchicalMultiSelect, HierarchicalGroup } from "@/components/ui/hierarchical-multi-select";
import { HierarchicalSingleSelect, HierarchicalGroup as SingleSelectGroup } from "@/components/ui/hierarchical-single-select";
import { formatBudget } from "@/lib/entities";

// Colors for the revenue vs expenses chart
const METRIC_COLORS = {
  revenue: "#009edb",    // UN blue
  expenses: "#2d6a7e",   // UN blue dark
};

// UN Blue for "all entities"
const UN_BLUE = "#009edb";

// System grouping colors (from globals.css)
const SYSTEM_GROUP_COLORS: Record<string, string> = {
  "UN Secretariat": "#d1d5db",  // gray-300
  "Peacekeeping Operations and Political Missions": "#a0665c",  // au-chico
  "Peacekeeping Operations": "#a0665c",  // au-chico
  "Regional Commissions": "#6c5b7b",  // smoky
  "Funds and Programmes": "#7d8471",  // camouflage-green
  "Research and Training": "#7d8471",  // camouflage-green
  "Subsidiary Organs": "#495057",  // trout
  "International Court of Justice": "#5a6c7d",  // shuttle-gray
  "Specialized Agencies": "#5a6c7d",  // shuttle-gray
  "Related Organizations": "#1f2937",  // gray-800
  "Other Entities": "#6b7280",  // gray-500
  "Other Bodies": "#9b8b7a",  // pale-oyster
  "Intergovernmental and Expert Bodies": "#6b7280",  // gray-500
  "Uncategorized": "#9ca3af",  // gray-400
};

// Tailwind class mapping for system groups (for multi-select component)
const SYSTEM_GROUP_BG_CLASSES: Record<string, string> = {
  "UN Secretariat": "bg-gray-300",
  "Peacekeeping Operations and Political Missions": "bg-au-chico",
  "Peacekeeping Operations": "bg-au-chico",
  "Regional Commissions": "bg-smoky",
  "Funds and Programmes": "bg-camouflage-green",
  "Research and Training": "bg-camouflage-green",
  "Subsidiary Organs": "bg-trout",
  "International Court of Justice": "bg-shuttle-gray",
  "Specialized Agencies": "bg-shuttle-gray",
  "Related Organizations": "bg-black",
  "Other Entities": "bg-gray-500",
  "Other Bodies": "bg-pale-oyster",
  "Intergovernmental and Expert Bodies": "bg-gray-500",
  "Uncategorized": "bg-gray-400",
};

// Color palette for compare lines - designed for good contrast
const LINE_COLORS = [
  "#009edb", // UN blue
  "#2d6a7e", // UN blue dark
  "#4a7c7e", // faded jade  
  "#7d8471", // camouflage green
  "#9b7c6b", // au chico
  "#3d5a6c", // UN blue slate
  "#4a90a4", // UN blue muted
  "#6b7280", // gray
  "#1e3a5f", // navy
  "#5c8a4d", // forest green
];

// Type for entity trends data
interface EntityYearData {
  year: number;
  revenue: number | null;
  expenses: number | null;
}

interface EntityTrendsData {
  meta: {
    years: number[];
    systemGroups: string[];
    entitiesByGroup: Record<string, string[]>;
  };
  aggregates: Record<string, EntityYearData[]>;
  entities: Record<string, EntityYearData[]>;
}

export function EntityTrendsChart() {
  const [data, setData] = React.useState<EntityTrendsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Left chart: single selection for revenue vs expenses
  const [selectedEntity, setSelectedEntity] = React.useState<string>("all");
  
  // Right chart: multi-selection for comparing expenses (default set after data loads)
  const [compareSelected, setCompareSelected] = React.useState<Set<string>>(new Set());
  const [hasSetDefaultSelection, setHasSetDefaultSelection] = React.useState(false);

  // Load data on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/data/entity-trends.json");
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load entity trends:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Set default selection to top 4 system groups by expenses (once data loads)
  // Exclude catch-all categories like "Other Entities"
  React.useEffect(() => {
    if (data && !hasSetDefaultSelection) {
      // Categories to exclude from default selection
      const excludeFromDefault = new Set(["Other Entities", "Other Bodies", "Intergovernmental and Expert Bodies", "Uncategorized"]);
      
      // Calculate total expenses for each system group (sum of latest year or all years)
      const groupExpenses: Array<{ group: string; total: number }> = [];
      
      for (const group of data.meta.systemGroups) {
        if (excludeFromDefault.has(group)) continue;
        
        const groupData = data.aggregates[group];
        if (groupData) {
          // Sum all non-null expenses
          const total = groupData.reduce((sum, d) => sum + (d.expenses || 0), 0);
          groupExpenses.push({ group, total });
        }
      }
      
      // Sort by total expenses descending and take top 4
      groupExpenses.sort((a, b) => b.total - a.total);
      const top4 = groupExpenses.slice(0, 4).map((g) => g.group);
      
      setCompareSelected(new Set(top4));
      setHasSetDefaultSelection(true);
    }
  }, [data, hasSetDefaultSelection]);

  // Build hierarchical groups for left chart (single select)
  const singleSelectGroups: SingleSelectGroup[] = React.useMemo(() => {
    if (!data) return [];
    
    // "All entities" as a top-level option (no children)
    const result: SingleSelectGroup[] = [
      {
        id: "all",
        label: "All entities",
        children: [],
        color: UN_BLUE,
      },
    ];
    
    // System groups with their entities as children
    data.meta.systemGroups.forEach((group) => {
      result.push({
        id: group,
        label: group,
        children: data.meta.entitiesByGroup[group] || [],
        color: SYSTEM_GROUP_COLORS[group] || "#6b7280",
      });
    });
    
    return result;
  }, [data]);

  // Get label for selected entity
  const getSelectedLabel = React.useCallback((id: string) => {
    if (id === "all") return "All entities";
    return id;
  }, []);

  // Build hierarchical groups for right chart (multi-select)
  const compareGroups: HierarchicalGroup[] = React.useMemo(() => {
    if (!data) return [];
    
    // "All entities" as a top-level option
    const result: HierarchicalGroup[] = [
      {
        id: "all",
        label: "All entities",
        bgColor: "bg-un-blue",
        children: [],
      },
    ];
    
    // System groups with their entities as children
    data.meta.systemGroups.forEach((group) => {
      result.push({
        id: group,
        label: group,
        bgColor: SYSTEM_GROUP_BG_CLASSES[group] || "bg-gray-500",
        children: data.meta.entitiesByGroup[group] || [],
      });
    });
    
    return result;
  }, [data]);

  // Data for left chart (revenue vs expenses for selected entity)
  const revenueExpensesData = React.useMemo(() => {
    if (!data) return [];
    
    const entityData = selectedEntity === "all" || data.meta.systemGroups.includes(selectedEntity)
      ? data.aggregates[selectedEntity]
      : data.entities[selectedEntity];
    
    if (!entityData) return [];
    
    return entityData.map((item) => ({
      year: item.year.toString(),
      Revenue: item.revenue,
      Expenses: item.expenses,
    }));
  }, [data, selectedEntity]);


  // Data for right chart (compare expenses)
  const compareData = React.useMemo(() => {
    if (!data) return [];
    
    return data.meta.years.map((year) => {
      const point: Record<string, number | string | null> = { year: year.toString() };
      
      Array.from(compareSelected).forEach((id) => {
        // Get the year data
        const entityData = id === "all" || data.meta.systemGroups.includes(id)
          ? data.aggregates[id]
          : data.entities[id];
        
        if (entityData) {
          const yearData = entityData.find((d) => d.year === year);
          const displayName = id === "all" ? "All entities" : id;
          point[displayName] = yearData?.expenses ?? null;
        }
      });
      
      return point;
    });
  }, [data, compareSelected]);

  // Get line configurations for compare chart
  const { compareLines, colorMap } = React.useMemo(() => {
    const result: { dataKey: string; color: string }[] = [];
    const colors: Record<string, string> = {};
    let colorIdx = 0;
    
    Array.from(compareSelected).forEach((id) => {
      const displayName = id === "all" ? "All entities" : id;
      const color = LINE_COLORS[colorIdx % LINE_COLORS.length];
      colors[id] = color;
      
      result.push({
        dataKey: displayName,
        color,
      });
      colorIdx++;
    });
    
    return { compareLines: result, colorMap: colors };
  }, [compareSelected]);

  // Get color for a selected item (for legend chips)
  const getItemColor = React.useCallback((id: string) => colorMap[id], [colorMap]);

  // Custom tooltip formatter
  const formatTooltipValue = (value: unknown) => {
    if (value === null || value === undefined || typeof value !== "number") return "N/A";
    return formatBudget(value);
  };

  // Y-axis tick formatter
  const formatYAxis = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    return `$${value}`;
  };

  return (
    <>
      {/* Charts container - grid for aligned columns */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Chart A: Revenue vs Expenses (single selection) */}
        <div className="flex flex-col">
          {/* Title and selector */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Revenue vs Expenses
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <HierarchicalSingleSelect
                groups={singleSelectGroups}
                selected={selectedEntity}
                onChange={setSelectedEntity}
                getLabel={getSelectedLabel}
              />
              
              {/* Legend */}
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 px-2 text-xs text-gray-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: METRIC_COLORS.revenue }} />
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 px-2 text-xs text-gray-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: METRIC_COLORS.expenses }} />
                <span>Expenses</span>
              </div>
            </div>
          </div>

          {/* Chart - mt-auto pushes to bottom of grid cell */}
          <div className="mt-auto pt-3 h-[280px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Loading trends...
                </div>
              ) : revenueExpensesData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No data available for {getSelectedLabel(selectedEntity)}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueExpensesData}
                    margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      orientation="right"
                      width={1}
                      tick={{ fontSize: 11, fill: "#6b7280", dx: -5, dy: -8 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={formatYAxis}
                      mirror
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label) => `Year: ${label}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke={METRIC_COLORS.revenue}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Expenses"
                      stroke={METRIC_COLORS.expenses}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>

        {/* Chart B: Compare expenses (multi-selection) */}
        <div className="flex flex-col">
          {/* Title and chips */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Compare expenses
            </h4>
            <HierarchicalMultiSelect
              groups={compareGroups}
              selected={compareSelected}
              onChange={setCompareSelected}
              getItemColor={getItemColor}
              addLabel="Add"
            />
          </div>

          {/* Chart - mt-auto pushes to bottom of grid cell */}
          <div className="mt-auto pt-3 h-[280px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Loading trends...
                </div>
              ) : compareSelected.size === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Select at least one entity to view trends
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={compareData}
                    margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                    />
                    <YAxis
                      orientation="right"
                      width={1}
                      tick={{ fontSize: 11, fill: "#6b7280", dx: -5, dy: -8 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={formatYAxis}
                      mirror
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label) => `Year: ${label}`}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    />
                    {compareLines.map((line) => (
                      <Line
                        key={line.dataKey}
                        type="monotone"
                        dataKey={line.dataKey}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>
      </div>
    </>
  );
}
