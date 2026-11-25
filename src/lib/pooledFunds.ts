import type { PooledFundMetric } from "@/types";
import { formatBudget } from "@/lib/entities";

export const MPTF_SOURCE = "https://mptf.undp.org";
export const MPTF_FEEDER_TYPE = "MULTILATERAL_FEEDER_FUND";
export const POOLED_FUND_METRICS: Record<
  PooledFundMetric,
  {
    label: string;
    shortLabel: string;
    totalLabel: string;
    color: string;
    note: string;
  }
> = {
  deposits: {
    label: "Deposits excluding fund transfers",
    shortLabel: "Deposits",
    totalLabel: "Deposits excluding fund transfers",
    color: "#009edb",
    note: "Money paid into a fund during the year. This view excludes deposits from other funds classified by MPTF as feeder funds; donor refunds are shown separately. Deposits are not expenditure.",
  },
  netTransfers: {
    label: "Net transfers (unconsolidated)",
    shortLabel: "Net transfers",
    totalLabel: "Net transfers",
    color: "#2d6a7e",
    note: "Money transferred out to participating organizations during the year, minus money they returned to the fund. A transfer does not mean the money has been spent. Transfers between funds are included, so these figures are unconsolidated.",
  },
  expenditure: {
    label: "Reported expenditure (unconsolidated)",
    shortLabel: "Expenditure",
    totalLabel: "Reported expenditure",
    color: "#6856a0",
    note: "Expenditure reported by participating organizations for the year, using their own accounting bases. It can include money transferred in earlier years, so expenditure can exceed this year's transfers. Figures are unconsolidated: reporting can lag or be revised, and fund reporting can overlap.",
  },
};
export const POOLED_FUND_CATEGORIES: Record<string, string> = {
  Development: "#009edb",
  "Peace and transition": "#6856a0",
  "Climate and environment": "#3c8272",
  Humanitarian: "#bb663c",
  "Not specified": "#6b7280",
};
export function pooledFundColor(category: string) {
  return POOLED_FUND_CATEGORIES[category] ?? "#6b7280";
}
export function pooledFundTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "UNDG MDTF": "Multi-partner trust fund",
    "UNDG Joint Programme": "Joint programme",
    "UNDG One UN Fund": "Country pooled fund",
    "UN Secretary General Fund": "Secretary-General fund",
    "UN Secretariat Fund": "UN Secretariat fund",
    "UN Single Agency Fund": "Single-agency fund",
    "Multi-window Fund": "Multi-window fund",
    "National Fund": "National fund",
  };
  return labels[type] ?? type;
}
export function formatPooledAmount(amount: number | null | undefined) {
  return amount == null ? "Not reported" : formatBudget(amount);
}
export function pooledFundHref(id: string, year: number) {
  return `/system/pooled-funds/?year=${year}#fund=${encodeURIComponent(`${id}@${year}`)}`;
}
export function parsePooledFundHash(value: string) {
  const [id, rawYear] = value.split("@");
  const year = rawYear && /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
  return { id, year };
}

/** A missing input keeps the aggregate unknown; a reported zero stays zero. */
export function sumPooledAmounts(
  values: readonly (number | null)[],
): number | null {
  return values.length === 0 || values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}
