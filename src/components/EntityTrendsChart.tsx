"use client";

import { LegendLabel } from "@un-eosg/ui/components/legend-label";

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
import {
  HierarchicalMultiSelect,
  HierarchicalGroup,
} from "@/components/ui/hierarchical-multi-select";
import {
  HierarchicalSingleSelect,
  HierarchicalGroup as SingleSelectGroup,
} from "@/components/ui/hierarchical-single-select";
import { formatBudget } from "@/lib/entities";
import {
  getSortedSystemGroupings,
  getSystemGroupingStyle,
} from "@/lib/systemGroupings";

// Colors for the revenue vs expenses chart
const METRIC_COLORS = {
  revenue: "#009edb", // UN blue
  expenses: "#2d6a7e", // UN blue dark
};

// UN Blue for "all entities"
const UN_BLUE = "#009edb";

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

  const [showRevenue, setShowRevenue] = React.useState(true);
  const [showExpenses, setShowExpenses] = React.useState(true);
  // Left chart: single selection for revenue vs expenses
  const [selectedEntity, setSelectedEntity] = React.useState<string>("all");

  // Right chart: multi-selection for comparing expenses (default set after data loads)
  const [compareSelected, setCompareSelected] = React.useState<Set<string>>(
    new Set(),
  );
  const [hasSetDefaultSelection, setHasSetDefaultSelection] =
    React.useState(false);

  // Only expose categories that contain entities in this CEB dataset. Keep the
  // shared taxonomy order so the treemap, selectors, and legends read alike.
  const availableSystemGroups = React.useMemo(() => {
    if (!data) return [];

    const presentGroups = new Set(
      Object.entries(data.meta.entitiesByGroup)
        .filter(([, entities]) => entities.length > 0)
        .map(([group]) => group),
    );
    const orderedGroups = getSortedSystemGroupings()
      .map(([group]) => group)
      .filter((group) => presentGroups.delete(group));
    const additionalGroups = [...presentGroups].sort((a, b) =>
      a.localeCompare(b),
    );

    return [...orderedGroups, ...additionalGroups];
  }, [data]);

  const getItemSystemGroup = React.useCallback(
    (id: string): string | null => {
      if (!data || id === "all") return null;
      if (availableSystemGroups.includes(id)) return id;

      return (
        availableSystemGroups.find((group) =>
          data.meta.entitiesByGroup[group]?.includes(id),
        ) ?? null
      );
    },
    [availableSystemGroups, data],
  );

  const getItemCategoryColor = React.useCallback(
    (id: string) => {
      if (id === "all") return UN_BLUE;
      const group = getItemSystemGroup(id);
      return group
        ? (getSystemGroupingStyle(group).hexColor ?? "#6b7280")
        : "#6b7280";
    },
    [getItemSystemGroup],
  );

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
      const excludeFromDefault = new Set([
        "Other Entities",
        "Other Bodies",
        "Intergovernmental and Expert Bodies",
        "Uncategorized",
      ]);

      // Calculate total expenses for each system group (sum of latest year or all years)
      const groupExpenses: Array<{ group: string; total: number }> = [];

      for (const group of availableSystemGroups) {
        if (excludeFromDefault.has(group)) continue;

        const groupData = data.aggregates[group];
        if (groupData) {
          // Sum all non-null expenses
          const total = groupData.reduce(
            (sum, d) => sum + (d.expenses || 0),
            0,
          );
          groupExpenses.push({ group, total });
        }
      }

      // Sort by total expenses descending and take top 4
      groupExpenses.sort((a, b) => b.total - a.total);
      const top4 = groupExpenses.slice(0, 4).map((g) => g.group);

      setCompareSelected(new Set(top4));
      setHasSetDefaultSelection(true);
    }
  }, [availableSystemGroups, data, hasSetDefaultSelection]);

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
    availableSystemGroups.forEach((group) => {
      result.push({
        id: group,
        label: getSystemGroupingStyle(group).label,
        children: data.meta.entitiesByGroup[group] || [],
        color: getSystemGroupingStyle(group).hexColor ?? "#6b7280",
      });
    });

    return result;
  }, [availableSystemGroups, data]);

  // Get label for selected entity
  const getSelectedLabel = React.useCallback(
    (id: string) => {
      if (id === "all") return "All entities";
      if (availableSystemGroups.includes(id)) {
        return getSystemGroupingStyle(id).label;
      }
      return id;
    },
    [availableSystemGroups],
  );

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
    availableSystemGroups.forEach((group) => {
      result.push({
        id: group,
        label: getSystemGroupingStyle(group).label,
        bgColor: getSystemGroupingStyle(group).bgColor,
        children: data.meta.entitiesByGroup[group] || [],
      });
    });

    return result;
  }, [availableSystemGroups, data]);

  // Data for left chart (revenue vs expenses for selected entity)
  const revenueExpensesData = React.useMemo(() => {
    if (!data) return [];

    const entityData =
      selectedEntity === "all" || availableSystemGroups.includes(selectedEntity)
        ? data.aggregates[selectedEntity]
        : data.entities[selectedEntity];

    if (!entityData) return [];

    return entityData.map((item) => ({
      year: item.year.toString(),
      Revenue: item.revenue,
      Expenses: item.expenses,
    }));
  }, [availableSystemGroups, data, selectedEntity]);

  // Data for right chart (compare expenses)
  const compareData = React.useMemo(() => {
    if (!data) return [];

    return data.meta.years.map((year) => {
      const point: Record<string, number | string | null> = {
        year: year.toString(),
      };

      Array.from(compareSelected).forEach((id) => {
        // Get the year data
        const entityData =
          id === "all" || availableSystemGroups.includes(id)
            ? data.aggregates[id]
            : data.entities[id];

        if (entityData) {
          const yearData = entityData.find((d) => d.year === year);
          const displayName = getSelectedLabel(id);
          point[displayName] = yearData?.expenses ?? null;
        }
      });

      return point;
    });
  }, [availableSystemGroups, data, compareSelected, getSelectedLabel]);

  // Get line configurations for compare chart
  const { compareLines, colorMap } = React.useMemo(() => {
    const result: { dataKey: string; color: string }[] = [];
    const colors: Record<string, string> = {};
    Array.from(compareSelected).forEach((id) => {
      const displayName = getSelectedLabel(id);
      const color = getItemCategoryColor(id);
      colors[id] = color;

      result.push({
        dataKey: displayName,
        color,
      });
    });

    return { compareLines: result, colorMap: colors };
  }, [compareSelected, getItemCategoryColor, getSelectedLabel]);

  // Get color for a selected item (for legend chips)
  const getItemColor = React.useCallback(
    (id: string) => colorMap[id],
    [colorMap],
  );

  // Custom tooltip formatter
  const formatTooltipValue = (value: unknown) => {
    if (value === null || value === undefined || typeof value !== "number")
      return "N/A";
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

              <LegendLabel
                label="Revenue"
                color={METRIC_COLORS.revenue}
                selected={showRevenue}
                onToggle={() => setShowRevenue((current) => !current)}
              />
              <LegendLabel
                label="Expenses"
                color={METRIC_COLORS.expenses}
                selected={showExpenses}
                onToggle={() => setShowExpenses((current) => !current)}
              />
            </div>
          </div>

          {/* Chart - mt-auto pushes to bottom of grid cell */}
          <div className="mt-auto h-[280px] w-full pt-3">
            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Loading trends...
              </div>
            ) : !showRevenue && !showExpenses ? (
              <div
                className="flex h-full items-center justify-center text-gray-500"
                role="status"
              >
                Select Revenue or Expenses to show the trend.
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
                    domain={[0, "auto"]}
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
                  {showRevenue && (
                    <Line
                      type="monotone"
                      dataKey="Revenue"
                      stroke={METRIC_COLORS.revenue}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  )}
                  {showExpenses && (
                    <Line
                      type="monotone"
                      dataKey="Expenses"
                      stroke={METRIC_COLORS.expenses}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      connectNulls={false}
                    />
                  )}
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
          <div className="mt-auto h-[280px] w-full pt-3">
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
                    domain={[0, "auto"]}
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
