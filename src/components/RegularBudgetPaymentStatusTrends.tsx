"use client";

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
    color: "#004987",
  },
  {
    key: "paid_late",
    label: "Paid in full after due date",
    color: "#66C6E8",
  },
  {
    key: "not_paid_in_full",
    label: "Not listed as paid in full",
    color: "#EAF7FB",
  },
];

export function RegularBudgetPaymentStatusTrends() {
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

  const chartData = useMemo(() => {
    if (!rows) return [];
    return rows.map((row) => {
      const amounts: Record<RegularBudgetPaymentStatus, number> = {
        paid_on_time: 0,
        paid_late: 0,
        not_paid_in_full: 0,
      };
      for (const contributor of row.contributors) {
        amounts[contributor.payment_status] += contributor.assessment_amount;
      }
      return {
        year: String(row.meta.year),
        ...amounts,
      };
    });
  }, [rows]);

  if (rows === null) {
    return (
      <div className="mt-8 h-[280px] text-sm text-gray-500">
        Loading payment-status trends…
      </div>
    );
  }
  if (chartData.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-medium text-gray-900">
        Payment status over time
      </h3>
      <p className="mb-4 max-w-3xl text-xs leading-relaxed text-gray-500">
        Stacked area is assessed dollars, grouped by honour-roll status at the
        close of each year.
      </p>
      <FinancingInstrumentChart data={chartData} series={STATUS_SERIES} />
    </div>
  );
}
