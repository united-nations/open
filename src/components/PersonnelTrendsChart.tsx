"use client";

import { useCallback, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { ChartHeading } from "@/components/ContentHeading";
import { PersonnelOrganizationSelect } from "@/components/PersonnelOrganizationSelect";
import { FinancialChartTooltip } from "@/components/charts/FinancialChartTooltip";
import {
  TREND_CHART_HEIGHT,
  TREND_CHART_MARGIN,
} from "@/components/charts/trendLayout";
import { useYearResource } from "@/hooks/useYearResource";
import { loadStaticData } from "@/lib/data";
import { formatPeople, type PersonnelTrendsData } from "@/lib/personnel";

export function PersonnelTrendsChart() {
  const [org, setOrg] = useState("all");
  const [showStaff, setShowStaff] = useState(true);
  const [retry, setRetry] = useState(0);
  const load = useCallback(
    () => loadStaticData<PersonnelTrendsData>("personnel-trends.json"),
    [],
  );
  const {
    value: data,
    loading,
    error,
  } = useYearResource<PersonnelTrendsData | null>(
    `personnel-trends-${retry}`,
    null,
    false,
    load,
    null,
  );
  const organizations = [
    ...new Set(
      data?.years.flatMap((row) => Object.keys(row.organizations)) ?? [],
    ),
  ];
  const rows =
    data?.years.map((row) => ({
      year: row.year,
      staff: org === "all" ? row.total : (row.organizations[org] ?? null),
    })) ?? [];
  return (
    <section id="personnel-trends" className="space-y-3">
      <ChartHeading>How has the workforce changed?</ChartHeading>
      <ChartFrame>
        <div
          className="mb-4 flex flex-wrap items-center gap-2"
          data-trend-legend
          aria-label="Workforce trend filters"
        >
          <PersonnelOrganizationSelect
            organizations={organizations}
            value={org}
            onChange={setOrg}
            label="Organization for workforce trend"
          />
          <LegendLabel
            label="Staff"
            color="#009edb"
            variant="pill"
            selected={showStaff}
            onToggle={() => setShowStaff((visible) => !visible)}
          />
        </div>
        {loading ? (
          <div
            role="status"
            className="flex h-72 items-center justify-center text-sm text-gray-600"
          >
            Loading personnel trends…
          </div>
        ) : error ? (
          <div role="alert" className="py-12 text-sm text-gray-600">
            Personnel trends could not be loaded.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : !showStaff ? (
          <p className="flex h-72 items-center justify-center text-sm text-gray-600">
            No series selected.
          </p>
        ) : (
          <div
            role="img"
            aria-label={`Annual staff counts for ${org === "all" ? "all reporting organizations" : org}`}
          >
            <ResponsiveContainer width="100%" height={TREND_CHART_HEIGHT}>
              <LineChart
                data={rows}
                margin={TREND_CHART_MARGIN}
                accessibilityLayer
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, "auto"]}
                  tickFormatter={(value) => formatPeople(Number(value))}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={65}
                />
                <Tooltip
                  position={{ x: 0, y: 0 }}
                  wrapperStyle={{ maxWidth: "100%" }}
                  isAnimationActive={false}
                  content={
                    <FinancialChartTooltip
                      formatValue={formatPeople}
                      unitLabel="Staff at 31 December"
                    />
                  }
                />
                <Line
                  type="linear"
                  dataKey="staff"
                  name="Staff"
                  stroke="#009edb"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartFrame>
    </section>
  );
}
