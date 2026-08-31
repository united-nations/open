"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FINANCING_INSTRUMENT_COLORS,
  FINANCING_INSTRUMENT_TOOLTIPS,
} from "@/lib/financingInstruments";
import { formatBudget } from "@/lib/contributors";

export interface FinancingInstrumentDataPoint {
  year: string;
  [key: string]: number | string;
}

export interface FinancingSeries {
  key: string;
  label: string;
  color: string;
  tooltip?: string;
}

// Default series = the CEB revenue financing instruments (4 categories).
const DEFAULT_SERIES: FinancingSeries[] = [
  { key: "Assessed", label: "Assessed", color: FINANCING_INSTRUMENT_COLORS.assessed, tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Assessed"] },
  { key: "Voluntary un-earmarked", label: "Voluntary un-earmarked", color: FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked, tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Voluntary un-earmarked"] },
  { key: "Voluntary earmarked", label: "Voluntary earmarked", color: FINANCING_INSTRUMENT_COLORS.voluntary_earmarked, tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Voluntary earmarked"] },
  { key: "Other", label: "Other", color: FINANCING_INSTRUMENT_COLORS.other, tooltip: FINANCING_INSTRUMENT_TOOLTIPS["Other"] },
];

interface FinancingInstrumentChartProps {
  data: FinancingInstrumentDataPoint[];
  /** Stacked series to render. Defaults to the CEB 4-category revenue scheme. */
  series?: FinancingSeries[];
  height?: number;
  showLegend?: boolean;
  compact?: boolean;
}

const formatYAxis = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value}`;
};

const formatTooltipValue = (value: number | undefined) => {
  if (value === undefined) return "";
  return formatBudget(value);
};

function LegendChip({ type, color, tooltip }: { type: string; color: string; tooltip?: string }) {
  const chip = (
    <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{type}</span>
    </div>
  );
  if (!tooltip) return chip;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className="cursor-help">{chip}</div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="max-w-[250px] border border-slate-200 bg-white text-slate-800 shadow-lg"
      >
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function FinancingInstrumentChart({
  data,
  height = 280,
  showLegend = true,
  compact = false,
  series = DEFAULT_SERIES,
}: FinancingInstrumentChartProps) {
  // Only render series that have at least one positive value across the data.
  const activeSeries = series.filter((s) =>
    data.some((d) => typeof d[s.key] === "number" && (d[s.key] as number) > 0)
  );

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const chartHeight = compact ? 180 : height;

  return (
    <div className="flex flex-col">
      {showLegend && (
        <div className="mb-3 flex flex-wrap gap-2">
          {activeSeries.map((s) => (
            <LegendChip key={s.key} type={s.label} color={s.color} tooltip={s.tooltip} />
          ))}
        </div>
      )}
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
          >
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
              tick={{ fontSize: compact ? 9 : 11, fill: "#6b7280", dx: -5, dy: -8 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              tickFormatter={formatYAxis}
              mirror
            />
            <RechartsTooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Year: ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            />
            {activeSeries.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="1"
                stroke={s.color}
                fill={s.color}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
