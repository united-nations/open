import type { RegularBudgetOutstandingData } from "@/types";
import { formatBudget, formatPercent } from "@un-eosg/ui/format-budget";

export const OUTSTANDING_TOTAL_COLOR = "var(--color-au-chico)";

const COUNTRY_COLORS = [
  "var(--color-un-blue-text)",
  "#7254a3",
  "#007a87",
  "var(--color-un-orange-shade)",
  "#39714b",
  "#9b7000",
  "#b34f8e",
  "#263d6a",
  "#55899b",
  "#707537",
  "#965684",
  "#495057",
];

/** Allocate once per country; retain assignments when selections are removed. */
export function assignOutstandingCountryColors(
  existing: Record<string, string>,
  names: string[],
): Record<string, string> {
  const colors = { ...existing };
  let index = Object.keys(colors).length;
  for (const name of names) {
    if (Object.hasOwn(colors, name)) continue;
    colors[name] =
      COUNTRY_COLORS[index] ??
      `hsl(${((210 + index * 137.508) % 360).toFixed(2)} 50% ${index % 2 ? 42 : 34}%)`;
    index++;
  }
  return colors;
}

export function outstandingAmount(
  snapshot: RegularBudgetOutstandingData | undefined,
  names?: string[],
): number | null {
  if (!snapshot) return null;
  if (!names?.length)
    return snapshot.meta.reported_total ?? snapshot.meta.total_outstanding;
  const amounts = names.map(
    (name) =>
      snapshot.contributors.find((row) => row.name === name)
        ?.outstanding_amount,
  );
  if (amounts.some((amount) => amount === undefined)) return null;
  return amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
}

export function formatReportedOutstandingTotal(
  snapshot: RegularBudgetOutstandingData,
) {
  return formatBudget(
    snapshot.meta.reported_total ?? snapshot.meta.total_outstanding,
  );
}

export function outstandingChange(
  current: number | null,
  previous: number | null,
) {
  if (current === null || previous === null)
    return { amount: null, percent: null, newBalance: false };
  return {
    amount: current - previous,
    percent: previous > 0 ? ((current - previous) / previous) * 100 : null,
    newBalance: previous === 0 && current > 0,
  };
}

export function percentageOf(amount: number | null, total: number | null) {
  return amount !== null && total !== null && total > 0
    ? (amount / total) * 100
    : null;
}

export function formatOutstandingPercent(value: number | null, signed = false) {
  if (value === null) return "Unavailable";
  return formatPercent(value, { signed, bounded: !signed });
}

export function outstandingSourceUrl(snapshot: RegularBudgetOutstandingData) {
  return (
    snapshot.meta.source.url +
    (snapshot.meta.source.format === "pdf"
      ? `#page=${snapshot.meta.source.page}`
      : "")
  );
}
