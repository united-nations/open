"use client";
import { TREND_CHART_MARGIN } from "@/components/charts/trendLayout";
import { FinancialChartTooltip } from "./FinancialChartTooltip";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

export interface EntityTrendDataPoint {
  year: string;
  revenue: number | null;
  expenses: number | null;
}

interface EntityTrendChartProps {
  data: EntityTrendDataPoint[];
  height?: number;
  compact?: boolean;
}

const formatYAxis = sharedFormatBudget;

export function EntityTrendChart({
  data,
  height = 180,
  compact = true,
}: EntityTrendChartProps) {
  if (data.length === 0) return null;

  // Filter to only show years with data
  const validData = data.filter(
    (d) => d.revenue !== null || d.expenses !== null,
  );
  if (validData.length === 0) return null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={validData} margin={TREND_CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: compact ? 10 : 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            orientation="right"
            width={1}
            tick={{
              fontSize: compact ? 9 : 11,
              fill: "#6b7280",
              dx: -5,
              dy: -8,
            }}
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
            tickFormatter={formatYAxis}
            mirror
          />
          <RechartsTooltip
            content={(props) => <FinancialChartTooltip {...props} />}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#009edb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#4a7c7e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
