import {
  fundingSources,
  type FundingSource,
} from "@un-eosg/ui/funding-sources";
import organizationTaxonomies from "../../data/organization-taxonomies.json";

// Financing instrument definitions and colors based on UN Data Standards

export const FINANCING_SOURCE_KEYS: Record<string, FundingSource> = {
  Assessed: "assessed",
  "Voluntary un-earmarked": "voluntary-unearmarked",
  "Voluntary earmarked": "voluntary-earmarked",
  Other: "other",
  "Regular budget": "regular_budget",
  "Other assessed": "other_assessed",
  Extrabudgetary: "extrabudgetary",
};
export const FINANCING_INSTRUMENT_COLORS = {
  assessed: fundingSources.assessed.color,
  voluntary_unearmarked: fundingSources["voluntary-unearmarked"].color,
  voluntary_earmarked: fundingSources["voluntary-earmarked"].color,
  other: fundingSources.other.color,
};
export const FINANCING_INSTRUMENT_BG_CLASSES: Record<string, string> = {
  Assessed: "bg-open-funding-assessed",
  "Voluntary un-earmarked": "bg-open-funding-voluntary-unearmarked",
  "Voluntary earmarked": "bg-open-funding-voluntary-earmarked",
  Other: "bg-open-funding-other",
};
export const FINANCING_INSTRUMENT_TOOLTIPS: Record<string, string> =
  Object.fromEntries(
    Object.entries(FINANCING_SOURCE_KEYS).map(([label, key]) => [
      label,
      fundingSources[key].explanation,
    ]),
  );

export type FinancingInstrumentType =
  | "Assessed"
  | "Voluntary un-earmarked"
  | "Voluntary earmarked"
  | "Other";

export const FINANCING_INSTRUMENT_ORDER =
  organizationTaxonomies.financing_instruments
    .toSorted((a, b) => a.order - b.order)
    .map(({ key }) => key) as FinancingInstrumentType[];

export const getFinancingInstrumentColor = (type: string): string => {
  if (type === "Assessed") return FINANCING_INSTRUMENT_COLORS.assessed;
  if (type === "Voluntary un-earmarked")
    return FINANCING_INSTRUMENT_COLORS.voluntary_unearmarked;
  if (type === "Voluntary earmarked")
    return FINANCING_INSTRUMENT_COLORS.voluntary_earmarked;
  return FINANCING_INSTRUMENT_COLORS.other;
};

export const getFinancingInstrumentBgClass = (type: string): string => {
  return FINANCING_INSTRUMENT_BG_CLASSES[type] || "bg-open-funding-other";
};

/** Tooltip reading order is independent of bottom-up treemap drawing order. */
export function orderFundingTooltipRows<T extends { label: string }>(
  rows: readonly T[] | undefined,
): T[] {
  const order = [
    "assessed",
    "voluntary-unearmarked",
    "voluntary-earmarked",
    "other",
    "regular_budget",
    "other_assessed",
    "extrabudgetary",
  ];
  const rank = (label: string) => {
    const index = order.indexOf(FINANCING_SOURCE_KEYS[label]);
    return index < 0 ? order.length : index;
  };
  return [...(rows ?? [])].sort((a, b) => rank(a.label) - rank(b.label));
}
