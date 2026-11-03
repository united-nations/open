"use client";

import { useEffect, useState } from "react";
import { loadYearData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import type { RegularBudgetOutstandingData } from "@/types";

let pending: Promise<RegularBudgetOutstandingData[]> | null = null;

export function useRegularBudgetOutstanding() {
  const years = useYearRanges().regularBudgetOutstanding.years;
  const [rows, setRows] = useState<RegularBudgetOutstandingData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    pending ??= Promise.all(
      years.map((year) =>
        loadYearData<RegularBudgetOutstandingData>(
          "regular-budget-outstanding",
          year,
        ),
      ),
    ).catch((reason: unknown) => {
      pending = null;
      throw reason;
    });
    pending
      .then((data) => {
        if (active) setRows(data.sort((a, b) => a.meta.year - b.meta.year));
      })
      .catch(() => {
        if (active)
          setError(
            "Outstanding-contribution data could not be loaded. Reload to try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [years]);
  return { rows, error };
}
