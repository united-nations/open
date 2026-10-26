"use client";
import { contributorYearAvailable } from "@/lib/revenueCoverage";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { FinancialChartTooltip } from "./charts/FinancialChartTooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

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

// Type for the contributor trends data
interface ContributorYearData {
  year: number;
  available?: boolean;
  total: number;
  assessed: number;
  other: number;
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
    new Set(["gov", "non-gov", "unattributed"]),
  );
  const [financingContributor, setFinancingContributor] =
    React.useState<string>("all");

  // Load data on mount
  React.useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/data/contributor-trends.json`,
        );
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
      {
        id: "unattributed",
        label: "Unattributed",
        bgColor: "bg-dusty-gray",
        children: [],
      },
      {
        id: "all",
        label: "All contributors",
        bgColor: "bg-un-blue",
        children: [],
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
      { id: "unattributed", label: "Unattributed", children: [] },
    ];
  }, [data]);

  const getFinancingLabel = React.useCallback((id: string) => {
    if (id === "all") return "All contributors";
    if (id === "gov") return "Government";
    if (id === "non-gov") return "Non-Government";
    if (id === "unattributed") return "Unattributed";
    return id;
  }, []);

  // Transform data for the chart based on selection
  const chartData = React.useMemo(() => {
    if (!data) return [];

    const years = data.meta.years;
    return years.map((year, idx) => {
      const point: Record<string, number | string | null> = {
        year: year.toString(),
      };

      // Add data for each selected item
      Array.from(selected).forEach((id) => {
        if (id === "gov") {
          point["Government"] = contributorYearAvailable(
            id,
            year,
            data.meta.governmentContributors,
          )
            ? (data.aggregates.gov[idx]?.total ?? 0)
            : null;
        } else if (id === "non-gov") {
          point["Non-Government"] = data.aggregates["non-gov"][idx]?.total || 0;
        } else if (id === "unattributed" || id === "all") {
          point[id === "all" ? "All contributors" : "Unattributed"] =
            contributorYearAvailable(id, year, data.meta.governmentContributors)
              ? (data.aggregates[id][idx]?.total ?? 0)
              : null;
        } else if (id.startsWith("cat:") && data.aggregates[id]) {
          // Category aggregate - prefix to avoid collision with individual donors
          const catName = id.replace("cat:", "") + " (all)";
          point[catName] = contributorYearAvailable(
            id,
            year,
            data.meta.governmentContributors,
          )
            ? (data.aggregates[id][idx]?.total ?? 0)
            : null;
        } else if (data.contributors[id]) {
          point[id] =
            contributorYearAvailable(
              id,
              year,
              data.meta.governmentContributors,
            ) && data.contributors[id][idx]?.available !== false
              ? (data.contributors[id][idx]?.total ?? 0)
              : null;
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
      } else if (id === "unattributed") {
        name = "Unattributed";
      } else if (id === "all") {
        name = "All contributors";
      } else if (id.startsWith("cat:")) {
        name = id.replace("cat:", "") + " (all)";
      } else {
        name = id;
      }

      const color =
        id === "unattributed"
          ? "#777777"
          : LINE_COLORS[colorIdx % LINE_COLORS.length];
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
        financingContributor === "non-gov" ||
        financingContributor === "unattributed"
      ) {
        sourceData = data.aggregates[financingContributor];
      } else {
        sourceData = data.contributors[financingContributor];
      }

      if (!sourceData) return [];

      return sourceData
        .filter(
          (item) =>
            contributorYearAvailable(
              financingContributor,
              item.year,
              data.meta.governmentContributors,
            ) && item.available !== false,
        )
        .map((item) => ({
          year: item.year.toString(),
          Assessed: item.assessed,
          "Voluntary un-earmarked": item.voluntary_unearmarked,
          "Voluntary earmarked": item.voluntary_earmarked,
          Other: item.other,
        }));
    }, [data, financingContributor]);

  // Controls depend on the asynchronously loaded contributor groups. Mount
  // them with the data so their generated IDs are not hydrated across a
  // changing sibling tree while the other contributor chart finishes loading.
  if (loading) {
    return (
      <div
        role="status"
        className="mt-6 flex h-80 items-center justify-center text-gray-500"
      >
        Loading contributor trends…
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 text-sm text-gray-600">
        2009–2010 contain partial non-government donor records only, without
        system-wide revenue controls. Government detail starts in 2013;
        remaining controlled revenue in 2011–2012 is Unattributed. Missing
        government years are not zero contributions.
      </p>
      {/* Charts container - grid for aligned columns */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        {/* Chart A: Compare contributors (line chart) */}
        <div className="flex flex-col">
          {/* Title and chips */}
          <div className="space-y-2 pb-3">
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
          <div
            className="mt-auto w-full shrink-0"
            style={{ height: TREND_CHART_HEIGHT }}
          >
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
                <LineChart data={chartData} margin={TREND_CHART_MARGIN}>
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
                    domain={["auto", "auto"]}
                    tickFormatter={sharedFormatBudget}
                    mirror
                  />
                  <Tooltip
                    content={(props) => <FinancialChartTooltip {...props} />}
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
          <div className="space-y-2 pb-3">
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
          <div className="mt-auto">
            {loading ? (
              <div
                className="flex items-center justify-center text-gray-500"
                style={{ height: TREND_CHART_HEIGHT }}
              >
                Loading trends...
              </div>
            ) : (
              <FinancingInstrumentChart
                data={financingInstrumentData}
                height={TREND_CHART_HEIGHT}
                filterable
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
