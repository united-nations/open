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
import {
  HierarchicalMultiSelect,
  HierarchicalGroup,
} from "@/components/ui/hierarchical-multi-select";
import {
  HierarchicalSingleSelect,
  HierarchicalGroup as SingleSelectGroup,
} from "@/components/ui/hierarchical-single-select";
import {
  FinancingInstrumentChart,
  FinancingInstrumentDataPoint,
} from "@/components/charts/FinancingInstrumentChart";
import { formatBudget } from "@/lib/contributors";

// Type for the contributor trends data
interface ContributorYearData {
  year: number;
  total: number;
  assessed: number;
  voluntary_earmarked: number;
  voluntary_unearmarked: number;
}

interface ContributorTrendsData {
  meta: {
    years: number[];
    governmentContributors: string[];
    nonGovContributors: string[];
    nonGovCategories?: Record<string, string[]>; // category -> donors
  };
  aggregates: Record<string, ContributorYearData[]>; // includes gov, non-gov, all, cat:X
  contributors: Record<string, ContributorYearData[]>;
}

// Color palette for lines - designed for good contrast
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

export function ContributorTrendsChart() {
  const [data, setData] = React.useState<ContributorTrendsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(["gov", "non-gov"]),
  );
  const [financingContributor, setFinancingContributor] =
    React.useState<string>("all");

  // Load data on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/data/contributor-trends.json");
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Failed to load contributor trends:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Build hierarchical groups for compare chart (multi-select)
  const groups: HierarchicalGroup[] = React.useMemo(() => {
    if (!data) return [];

    const nonGovSubgroups = data.meta.nonGovCategories
      ? Object.entries(data.meta.nonGovCategories).map(([cat, donors]) => ({
          id: `cat:${cat}`,
          label: cat,
          children: donors,
        }))
      : [];

    return [
      {
        id: "gov",
        label: "Government",
        bgColor: "bg-un-blue",
        children: data.meta.governmentContributors,
      },
      {
        id: "non-gov",
        label: "Non-Government",
        bgColor: "bg-smoky",
        children: [],
        subgroups: nonGovSubgroups,
      },
    ];
  }, [data]);

  // Build hierarchical groups for financing instrument chart (single-select)
  const financingSingleSelectGroups: SingleSelectGroup[] = React.useMemo(() => {
    if (!data) return [];

    return [
      { id: "all", label: "All contributors", children: [] },
      {
        id: "gov",
        label: "Government",
        children: data.meta.governmentContributors,
      },
      {
        id: "non-gov",
        label: "Non-Government",
        children: data.meta.nonGovContributors,
      },
    ];
  }, [data]);

  const getFinancingLabel = React.useCallback((id: string) => {
    if (id === "all") return "All contributors";
    if (id === "gov") return "Government";
    if (id === "non-gov") return "Non-Government";
    return id;
  }, []);

  // Transform data for the chart based on selection
  const chartData = React.useMemo(() => {
    if (!data) return [];

    const years = data.meta.years;
    return years.map((year, idx) => {
      const point: Record<string, number | string> = { year: year.toString() };

      // Add data for each selected item
      Array.from(selected).forEach((id) => {
        if (id === "gov") {
          point["Government"] = data.aggregates.gov[idx]?.total || 0;
        } else if (id === "non-gov") {
          point["Non-Government"] = data.aggregates["non-gov"][idx]?.total || 0;
        } else if (id.startsWith("cat:") && data.aggregates[id]) {
          // Category aggregate - prefix to avoid collision with individual donors
          const catName = id.replace("cat:", "") + " (all)";
          point[catName] = data.aggregates[id][idx]?.total || 0;
        } else if (data.contributors[id]) {
          point[id] = data.contributors[id][idx]?.total || 0;
        }
      });

      return point;
    });
  }, [data, selected]);

  // Get line configurations and color map based on selection
  const { lines, colorMap } = React.useMemo(() => {
    const result: { dataKey: string; color: string; name: string }[] = [];
    const colors: Record<string, string> = {};
    let colorIdx = 0;

    Array.from(selected).forEach((id) => {
      let name: string;
      if (id === "gov") {
        name = "Government";
      } else if (id === "non-gov") {
        name = "Non-Government";
      } else if (id.startsWith("cat:")) {
        name = id.replace("cat:", "") + " (all)";
      } else {
        name = id;
      }

      const color = LINE_COLORS[colorIdx % LINE_COLORS.length];
      colors[id] = color;

      result.push({
        dataKey: name,
        color,
        name,
      });
      colorIdx++;
    });

    return { lines: result, colorMap: colors };
  }, [selected]);

  // Get color for a selected item (passed to HierarchicalMultiSelect for legend chips)
  const getItemColor = React.useCallback(
    (id: string) => colorMap[id],
    [colorMap],
  );

  // Custom tooltip formatter
  const formatTooltipValue = (value: number | undefined) => {
    if (value === undefined) return "";
    return formatBudget(value);
  };

  // Data for stacked area chart (financing instruments, filtered by selected contributor)
  const financingInstrumentData: FinancingInstrumentDataPoint[] =
    React.useMemo(() => {
      if (!data) return [];

      // Get the appropriate data based on selection
      let sourceData: ContributorYearData[] | undefined;
      if (financingContributor === "all") {
        sourceData = data.aggregates.all;
      } else if (
        financingContributor === "gov" ||
        financingContributor === "non-gov"
      ) {
        sourceData = data.aggregates[financingContributor];
      } else {
        sourceData = data.contributors[financingContributor];
      }

      if (!sourceData) return [];

      return sourceData.map((item) => ({
        year: item.year.toString(),
        Assessed: item.assessed,
        "Voluntary un-earmarked": item.voluntary_unearmarked,
        "Voluntary earmarked": item.voluntary_earmarked,
      }));
    }, [data, financingContributor]);

  return (
    <>
      {/* Charts container - grid for aligned columns */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Chart A: Compare contributors (line chart) */}
        <div className="flex flex-col">
          {/* Title and chips */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Compare contributors
            </h4>
            <HierarchicalMultiSelect
              groups={groups}
              selected={selected}
              onChange={setSelected}
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
            ) : selected.size === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Select at least one contributor to view trends
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
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
                    tickFormatter={(value) => {
                      if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
                      if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
                      return `$${value}`;
                    }}
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
                  {lines.map((line) => (
                    <Line
                      key={line.dataKey}
                      type="monotone"
                      dataKey={line.dataKey}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Financing instruments (stacked area chart) */}
        <div className="flex flex-col">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Funding by financing instrument
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <HierarchicalSingleSelect
                groups={financingSingleSelectGroups}
                selected={financingContributor}
                onChange={setFinancingContributor}
                getLabel={getFinancingLabel}
              />
            </div>
          </div>
          <div className="mt-auto pt-3">
            {loading ? (
              <div className="flex h-[280px] items-center justify-center text-gray-500">
                Loading trends...
              </div>
            ) : (
              <FinancingInstrumentChart
                data={financingInstrumentData}
                height={280}
                filterable
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
