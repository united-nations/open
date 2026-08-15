// Grouping configuration for the budget-document treemaps on /secretariat
// (data written by python/12-export_budget_json.py).
//
// Each treemap draws one level of the tree as tiles, grouped and colored by the
// level above (or, for peacekeeping, by cost class). The lenses are:
//   Programme budget  sections, grouped by budget part
//   Peacekeeping      cost classes, grouped by mission -or- by cost class
//
// The Budget-Part colors are the ones the older Secretariat treemap already
// uses, so the two pages stay recognizable.

import type { SystemGroupingStyle } from "@/lib/systemGroupings";
import { PALETTE, budgetPartStyles } from "@/lib/secretariatGroupings";

export type PpbLens = "budgetPart";
export type PkoLens = "mission" | "costClass";
export type BudgetLens = PpbLens | PkoLens;

/** Palette styles for an ordered list of group keys (first key = first color). */
export function buildOrderedStyles(
  keys: string[],
  labels: Record<string, string> = {}
): Record<string, SystemGroupingStyle> {
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      {
        label: labels[key] ?? key,
        ...PALETTE[i % PALETTE.length],
        order: i + 1,
      },
    ])
  );
}

/** Budget parts, keyed by Roman numeral, as emitted by python/12. */
export const partStyles: Record<string, SystemGroupingStyle> = budgetPartStyles;

/** The three peacekeeping cost classes, in the order the fascicles print them. */
export const costClassStyles: Record<string, SystemGroupingStyle> = {
  military_police_personnel: {
    label: "Military and police personnel",
    bgColor: "bg-un-blue",
    textColor: "text-white",
    order: 1,
  },
  civilian_personnel: {
    label: "Civilian personnel",
    bgColor: "bg-faded-jade",
    textColor: "text-white",
    order: 2,
  },
  operational_costs: {
    label: "Operational costs",
    bgColor: "bg-au-chico",
    textColor: "text-white",
    order: 3,
  },
};

/** Band fills for the three cost classes, matching costClassStyles above. */
export const COST_CLASS_BAND_COLORS: Record<string, { bg: string; hover: string }> = {
  military_police_personnel: { bg: "#009edb", hover: "#007ab8" },
  civilian_personnel: { bg: "#4a7c7e", hover: "#3d6668" },
  operational_costs: { bg: "#a0665c", hover: "#84544c" },
};

/** Short captions for the tiles of a mission band. */
export const COST_CLASS_SHORT: Record<string, string> = {
  military_police_personnel: "Military & police",
  civilian_personnel: "Civilian staff",
  operational_costs: "Operational",
};

/**
 * Peacekeeping runs from July to June, so the cycle that starts in 2024 is
 * written "2024/25". The data files are keyed by the first year.
 */
export function fiscalYearLabel(year: number): string {
  return `${year}/${String(year + 1).slice(2)}`;
}

/** The funding sources of the programme budget, in the order the fascicles use. */
export const FUNDING_SOURCES: Record<
  string,
  { label: string; color: string; tooltip: string }
> = {
  regular_budget: {
    label: "Regular budget",
    color: "bg-un-blue",
    tooltip: "Assessed contributions to the regular programme budget",
  },
  other_assessed: {
    label: "Other assessed",
    color: "bg-un-blue-dark",
    tooltip: "Separately assessed budgets, chiefly peacekeeping and the tribunals",
  },
  extrabudgetary: {
    label: "Extrabudgetary",
    color: "bg-[#4db8e8]",
    tooltip: "Voluntary contributions and other extrabudgetary resources",
  },
};

export const FALLBACK_STYLE: SystemGroupingStyle = {
  label: "Other",
  bgColor: "bg-gray-400",
  textColor: "text-white",
  order: 999,
};

export function styleOf(
  styles: Record<string, SystemGroupingStyle>,
  key: string
): SystemGroupingStyle {
  return styles[key] ?? { ...FALLBACK_STYLE, label: key };
}
