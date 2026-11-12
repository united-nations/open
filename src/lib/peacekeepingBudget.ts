export type PeacekeepingMetric = "expenditure" | "approved" | "proposed";
export const PEACEKEEPING_ASSESSMENT_COLOR = "var(--color-un-blue-shade)";
export const PEACEKEEPING_METRICS = {
  expenditure: "Expenditure",
  approved: "Approved budget",
  proposed: "Proposed budget",
} as const;

export const PEACEKEEPING_SIDEBAR_HASH = "pko-mission";

export function peacekeepingSidebarValue(
  code: string,
  metric: PeacekeepingMetric,
  year: number,
) {
  return `${code}|${metric}|${year}`;
}

export function peacekeepingSidebarHash(
  code: string,
  metric: PeacekeepingMetric,
  year: number,
) {
  return `${PEACEKEEPING_SIDEBAR_HASH}=${encodeURIComponent(peacekeepingSidebarValue(code, metric, year))}`;
}

export function parsePeacekeepingSidebarValue(value: string): {
  code: string;
  lens: { metric: PeacekeepingMetric; year: number } | null;
} {
  const [code, metric, year] = value.split("|");
  if (
    (metric === "expenditure" ||
      metric === "approved" ||
      metric === "proposed") &&
    /^\d{4}$/.test(year ?? "")
  ) {
    return { code, lens: { metric, year: Number(year) } };
  }
  return { code, lens: null };
}
