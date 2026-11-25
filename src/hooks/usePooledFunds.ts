"use client";

import { useCallback } from "react";
import { useYearResource } from "@/hooks/useYearResource";
import { loadStaticData, loadYearData } from "@/lib/data";
import { useYearRanges } from "@/lib/useYearRanges";
import type { PooledFundsIndex, PooledFundYear } from "@/types";

let indexRequest: Promise<PooledFundsIndex> | undefined;
const years = new Map<number, Promise<PooledFundYear>>();
const loadIndex = () => {
  indexRequest ??= loadStaticData<PooledFundsIndex>("pooled-funds.json").catch(
    (error: unknown) => {
      indexRequest = undefined;
      throw error;
    },
  );
  return indexRequest;
};
export function usePooledFunds() {
  return useYearResource<PooledFundsIndex | null>(
    "pooled-funds",
    null,
    false,
    loadIndex,
    null,
  );
}
export function usePooledFundYear(year: number) {
  const available = useYearRanges().pooledFunds.years.includes(year);
  const load = useCallback(() => {
    if (!years.has(year)) {
      years.set(
        year,
        loadYearData<PooledFundYear>("pooled-funds", year).catch(
          (error: unknown) => {
            years.delete(year);
            throw error;
          },
        ),
      );
    }
    return years.get(year)!;
  }, [year]);
  return {
    ...useYearResource<PooledFundYear | null>(
      String(year),
      null,
      !available,
      load,
      null,
    ),
    available,
  };
}
