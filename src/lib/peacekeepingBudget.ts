export type PeacekeepingMetric = "expenditure" | "approved" | "proposed";
export const PEACEKEEPING_METRICS = {
  expenditure: "Expenditure",
  approved: "Approved budget",
  proposed: "Proposed budget",
} as const;
