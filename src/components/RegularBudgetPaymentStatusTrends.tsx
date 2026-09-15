"use client";
import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import {
  usePaymentChartScale,
  paymentScaleMaximum,
} from "@/components/PaymentChartScale";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";

import { useEffect, useMemo, useState } from "react";
import { FinancingInstrumentChart } from "@/components/charts/FinancingInstrumentChart";
import { loadYearData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import type {
  RegularBudgetContributorsData,
  RegularBudgetPaymentStatus,
} from "@/types";

const STATUS_SERIES: Array<{
  key: RegularBudgetPaymentStatus;
  label: string;
  color: string;
}> = [
  {
    key: "paid_on_time",
    label: "Paid in full on time",
    color: "var(--color-un-green-shade)",
  },
  {
    key: "paid_late",
    label: "Paid in full after due date",
    color: "var(--color-un-green)",
  },
  {
    key: "not_paid_in_full",
    label: "Not listed as paid in full",
    color: "var(--color-un-green-tint)",
  },
];

function coversFullCalendarYear(row: RegularBudgetContributorsData): boolean {
  const coverageEnd = Date.parse(`${row.meta.as_of}T00:00:00Z`);
  const yearEnd = Date.UTC(row.meta.year, 11, 31);
  return Number.isFinite(coverageEnd) && coverageEnd >= yearEnd;
}

function completedRows(
  rows: RegularBudgetContributorsData[],
): RegularBudgetContributorsData[] {
  const latestYear = Math.max(...rows.map((row) => row.meta.year));
  return rows.filter(
    (row) => row.meta.year !== latestYear || coversFullCalendarYear(row),
  );
}

export function RegularBudgetPaymentStatusTrends() {
  const [measure, setMeasure] = useState("amount");
  const [hidden, setHidden] = useState<RegularBudgetPaymentStatus[]>([]);
  const sharedScale = usePaymentChartScale();
  const setScales = sharedScale?.setScales;
  const years = useYearRanges().regularBudgetContributors.years;
  const [rows, setRows] = useState<RegularBudgetContributorsData[] | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    Promise.all(
      years.map((year) =>
        loadYearData<RegularBudgetContributorsData>(
          "regular-budget-contributors",
          year,
        ),
      ),
    )
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((error: unknown) => {
        console.error("Failed to load regular-budget payment trends:", error);
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [years]);

  useEffect(() => {
    if (!rows?.length || !setScales) return;
    setScales({
      amount: paymentScaleMaximum(
        Math.max(
          ...rows.map((row) =>
            Math.max(
              row.meta.assessment_total,
              row.contributors.reduce(
                (sum, item) => sum + item.assessment_amount,
                0,
              ),
            ),
          ),
        ),
      ),
      count: paymentScaleMaximum(
        Math.max(...rows.map((row) => row.contributors.length)),
      ),
    });
  }, [rows, setScales]);

  const chartData = useMemo(() => {
    if (!rows) return [];
    return completedRows(rows).map((row) => {
      const amounts: Record<RegularBudgetPaymentStatus, number> = {
        paid_on_time: 0,
        paid_late: 0,
        not_paid_in_full: 0,
      };
      for (const contributor of row.contributors) {
        amounts[contributor.payment_status] +=
          measure === "count" ? 1 : contributor.assessment_amount;
      }
      return {
        year: String(row.meta.year),
        ...amounts,
      };
    });
  }, [rows, measure]);

  if (rows === null) {
    return (
      <section className="min-w-0 lg:row-span-4 lg:grid lg:grid-rows-subgrid">
        <h3 className="mb-3 text-lg font-medium text-gray-900">
          Payment status over the years
        </h3>
        <div className="flex h-80 items-center justify-center text-sm text-gray-500">
          Loading payment status…
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 lg:row-span-4 lg:grid lg:grid-rows-subgrid">
      <div className="contents">
        <h3 className="mb-3 text-lg font-medium text-gray-900">
          Payment status over the years
        </h3>

        <div
          className="mb-3 flex flex-wrap content-start items-start gap-2"
          role="group"
          aria-label="Payment status filters"
        >
          {STATUS_SERIES.map((item) => (
            <LegendLabel
              key={item.key}
              label={item.label}
              color={item.color}
              selected={!hidden.includes(item.key)}
              onToggle={() =>
                setHidden((current) =>
                  current.includes(item.key)
                    ? current.filter((key) => key !== item.key)
                    : [...current, item.key],
                )
              }
            />
          ))}
        </div>
        <div className="mb-3 flex items-start">
          <BinaryToggle
            variant="segmented"
            label="Payment status measure"
            options={[
              { value: "amount", label: "Assessed amount" },
              { value: "count", label: "Member States" },
            ]}
            value={measure}
            onValueChange={setMeasure}
          />
        </div>
      </div>
      {chartData.length > 0 ? (
        hidden.length === STATUS_SERIES.length ? (
          <div className="flex h-80 items-center justify-center text-sm text-gray-500">
            Select a payment status to show the trend.
          </div>
        ) : (
          <FinancingInstrumentChart
            data={chartData}
            series={STATUS_SERIES.filter((item) => !hidden.includes(item.key))}
            showLegend={false}
            height={320}
            showTooltipTotal
            tooltipValueFormatter={(value) =>
              measure === "count"
                ? `${value.toLocaleString("en-GB")} Member States`
                : sharedFormatBudget(value)
            }
            yAxisMax={
              sharedScale?.scales?.[measure === "count" ? "count" : "amount"]
            }
            valueFormatter={
              measure === "count"
                ? (value) =>
                    value.toLocaleString("en-GB", { maximumFractionDigits: 0 })
                : undefined
            }
          />
        )
      ) : (
        <div className="flex h-80 items-center justify-center text-center text-sm text-gray-500">
          No complete calendar years are available.
        </div>
      )}
    </section>
  );
}
