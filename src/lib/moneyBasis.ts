import index from "../../public/data/us-cpi.json";

export type MoneyBasis = "nominal" | "adjusted";
export interface MonetaryPoint {
  year?: string | number;
  [key: string]: string | number | null | undefined;
}
export const MONEY_BASE_YEAR = index.baseYear;
export const CPI_SOURCE_URL = index.sourceUrl;
export const ADJUSTED_UNITS = `${MONEY_BASE_YEAR} USD · US CPI`;

/** Calendar years, or July–June fiscal labels such as 2023/24. No extrapolation. */
export function moneyAdjustmentFactor(period: string | number): number | null {
  const match = String(period).match(/^(\d{4})(?:[\/–-](\d{2}|\d{4}))?$/);
  if (!match) return null;
  const first = Number(match[1]);
  const annual: Record<string, number> = index.annual;
  const firstIndex = annual[String(first)];
  if (!firstIndex) return null;
  let priceIndex = firstIndex;
  if (match[2]) {
    const end =
      match[2].length === 2
        ? Math.floor(first / 100) * 100 + Number(match[2])
        : Number(match[2]);
    if (end !== first + 1 || !annual[String(end)]) return null;
    // A transparent half-year weighting of the two published annual averages.
    priceIndex = (firstIndex + annual[String(end)]) / 2;
  }
  return annual[String(MONEY_BASE_YEAR)] / priceIndex;
}

/** Convert only chart series, retaining labels, signed corrections, zero and gaps. */
export function adjustMoneyData(
  rows: readonly MonetaryPoint[],
  keys: readonly string[],
  basis: MoneyBasis,
): readonly MonetaryPoint[] {
  if (basis === "nominal") return rows;
  return rows.map((row) => {
    const result = { ...row };
    const factor = moneyAdjustmentFactor(row.year ?? "");
    for (const key of keys) {
      const value = row[key];
      if (typeof value === "number")
        result[key] =
          factor === null || !Number.isFinite(value) ? null : value * factor;
    }
    return result;
  });
}

export function missingAdjustmentPeriods(
  rows: readonly MonetaryPoint[],
  keys: readonly string[],
): string[] {
  return [
    ...new Set(
      rows
        .filter(
          (row) =>
            keys.some((key) => typeof row[key] === "number") &&
            moneyAdjustmentFactor(row.year ?? "") === null,
        )
        .map((row) => String(row.year)),
    ),
  ];
}
