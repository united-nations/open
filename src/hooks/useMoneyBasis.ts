"use client";
import { useState } from "react";
import {
  ADJUSTED_UNITS,
  adjustMoneyData,
  missingAdjustmentPeriods,
  type MonetaryPoint,
  type MoneyBasis,
} from "@/lib/moneyBasis";

/** Chart-local state: never changes dataset totals or other visualizations. */
export function useMoneyBasis(
  rows: readonly MonetaryPoint[],
  keys: readonly string[],
  monetary = true,
) {
  const [selected, setBasis] = useState<MoneyBasis>("nominal");
  const basis = monetary ? selected : "nominal";
  return {
    basis,
    setBasis,
    data: adjustMoneyData(rows, keys, basis),
    missingPeriods:
      basis === "adjusted" ? missingAdjustmentPeriods(rows, keys) : [],
    unitLabel: basis === "adjusted" ? ADJUSTED_UNITS : undefined,
  };
}
