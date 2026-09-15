"use client";

import { useEffect, useState } from "react";
import { loadYearData } from "@/lib/data";

/** Keeps year-specific sidebar details separate from the chart's selection. */
export function useContributorSidebarYear<T>(
  dataset: string,
  initialYear: number,
) {
  const [year, setYear] = useState(initialYear);
  const [result, setResult] = useState<{
    year: number;
    data?: T;
    error?: string;
  }>();

  useEffect(() => {
    if (year === initialYear) return;
    let active = true;
    loadYearData<T>(dataset, year).then(
      (data) => {
        if (active) setResult({ year, data });
      },
      () => {
        if (active)
          setResult({
            year,
            error:
              "Unable to load this year's data. Select another year or try again.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [dataset, initialYear, year]);

  const current = result?.year === year ? result : undefined;
  return {
    year,
    setYear,
    data: current?.data,
    error: current?.error,
    loading: year !== initialYear && !current,
    isInitialYear: year === initialYear,
  };
}
