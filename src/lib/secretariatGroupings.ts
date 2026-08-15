// Visual styling for the two grouping lenses on the /secretariat page:
// - Priority Area (9 thematic areas)
// - Budget Part (formal budget structure, Parts I-XIV, keyed by part_id)
// Reuses the SystemGroupingStyle shape from systemGroupings.ts.

import type { SystemGroupingStyle } from "@/lib/systemGroupings";

export type GroupingLens = "priorityArea" | "budgetPart";

// Shared palette of theme bg classes (UN palette) with readable text colors.
// Also used by budgetGroupings.ts, so that every treemap on /secretariat draws
// its groups from one palette.
export const PALETTE: Array<{ bgColor: string; textColor: string }> = [
  { bgColor: "bg-un-blue", textColor: "text-white" },
  { bgColor: "bg-camouflage-green", textColor: "text-white" },
  { bgColor: "bg-au-chico", textColor: "text-white" },
  { bgColor: "bg-faded-jade", textColor: "text-white" },
  { bgColor: "bg-un-blue-slate", textColor: "text-white" },
  { bgColor: "bg-trout", textColor: "text-white" },
  { bgColor: "bg-smoky", textColor: "text-white" },
  { bgColor: "bg-pale-oyster", textColor: "text-white" },
  { bgColor: "bg-shuttle-gray", textColor: "text-white" },
  { bgColor: "bg-un-blue-dark", textColor: "text-white" },
  { bgColor: "bg-dusty-gray", textColor: "text-black" },
  { bgColor: "bg-un-blue-muted", textColor: "text-black" },
];

function build(labels: string[]): Record<string, SystemGroupingStyle> {
  return Object.fromEntries(
    labels.map((label, i) => [
      label,
      { label, ...PALETTE[i % PALETTE.length], order: i + 1 },
    ])
  );
}

// Priority areas — keyed by the exact PRIORITY_AREA strings in the data.
// Ordered roughly by typical budget magnitude for a sensible default layout.
export const priorityAreaStyles: Record<string, SystemGroupingStyle> = build([
  "Maintenance of international peace and security",
  "Effective functioning of the organization",
  "Promotion of sustained economic growth and sustainable development",
  "Promotion of international justice and law",
  "Promotion and protection of human rights",
  "Effective coordination of humanitarian assistance efforts",
  "Disarmament",
  "Development of Africa",
  "Drug control, crime prevention and combating terrorism",
]);

// Budget parts — keyed by part_id (Roman numeral). Labels are the part descriptions.
const PART_LABELS: Array<[string, string]> = [
  ["I", "Overall policymaking, direction and coordination"],
  ["II", "Political affairs"],
  ["III", "International justice and law"],
  ["IV", "International cooperation for development"],
  ["V", "Regional cooperation for development"],
  ["VI", "Human rights and humanitarian affairs"],
  ["VII", "Global Communications"],
  ["VIII", "Common support services"],
  ["IX", "Internal oversight"],
  ["X", "Jointly financed administrative activities and special expenses"],
  ["XI", "Capital expenditures"],
  ["XII", "Safety and security"],
  ["XIII", "Development Account"],
  ["XIV", "Staff assessment"],
];

// Short names for the part bands of the treemap, from ../budget-explorer, whose
// treemap this page's layout follows. The long descriptions above are too wide
// for the label column beside the bands.
export const PART_SHORT_NAMES: Record<string, string> = {
  I: "Policymaking & Coordination",
  II: "Political Affairs",
  III: "Justice & Law",
  IV: "International Development",
  V: "Regional Development",
  VI: "Human Rights & Humanitarian",
  VII: "Global Communications",
  VIII: "Support Services",
  IX: "Internal Oversight",
  X: "Joint Activities & Special",
  XI: "Capital Expenditure",
  XII: "Safety & Security",
  XIII: "Development Account",
  XIV: "Staff Assessment",
  "Peacekeeping Budget": "Peacekeeping (separate budget)",
};

/**
 * Band fill and hover colors, as hex rather than theme classes, because the
 * treemap paints them inline. Parts I-IX are the UN palette from globals.css;
 * X-XIV are the lighter variants ../budget-explorer adds, so that all fourteen
 * parts stay apart instead of cycling a twelve-color palette.
 */
export const PART_BAND_COLORS: Record<string, { bg: string; hover: string }> = {
  I: { bg: "#009edb", hover: "#007ab8" },
  II: { bg: "#4a7c7e", hover: "#3d6668" },
  III: { bg: "#7d8471", hover: "#666d5d" },
  IV: { bg: "#9b8b7a", hover: "#7f7264" },
  V: { bg: "#a0665c", hover: "#84544c" },
  VI: { bg: "#6c5b7b", hover: "#594b66" },
  VII: { bg: "#5a6c7d", hover: "#4a5967" },
  VIII: { bg: "#495057", hover: "#3a4045" },
  IX: { bg: "#969696", hover: "#7a7a7a" },
  X: { bg: "#33b8e8", hover: "#009edb" },
  XI: { bg: "#6a9a9c", hover: "#4a7c7e" },
  XII: { bg: "#9aa390", hover: "#7d8471" },
  XIII: { bg: "#b8a899", hover: "#9b8b7a" },
  XIV: { bg: "#c08579", hover: "#a0665c" },
  // Peacekeeping keeps the au-chico family it has in the entities treemap, one
  // shade darker than Part V so the two bands never read as the same group.
  "Peacekeeping Budget": { bg: "#7a4a42", hover: "#633b35" },
};

/** The same colors in order, for lenses that have no fixed key (priority areas). */
export const BAND_PALETTE: Array<{ bg: string; hover: string }> = [
  { bg: "#009edb", hover: "#007ab8" },
  { bg: "#4a7c7e", hover: "#3d6668" },
  { bg: "#7d8471", hover: "#666d5d" },
  { bg: "#9b8b7a", hover: "#7f7264" },
  { bg: "#a0665c", hover: "#84544c" },
  { bg: "#6c5b7b", hover: "#594b66" },
  { bg: "#5a6c7d", hover: "#4a5967" },
  { bg: "#495057", hover: "#3a4045" },
  { bg: "#969696", hover: "#7a7a7a" },
  { bg: "#33b8e8", hover: "#009edb" },
  { bg: "#6a9a9c", hover: "#4a7c7e" },
  { bg: "#9aa390", hover: "#7d8471" },
];

export const budgetPartStyles: Record<string, SystemGroupingStyle> = {
  // Peacekeeping is a separate budget (not part of the regular programme budget);
  // python/11 reclassifies its "Other Assessed" rows into this synthetic part.
  // Keyed by the exact part_id the export emits. au-chico matches the
  // peacekeeping color used in the main entities treemap. Order 0 = sorts first.
  "Peacekeeping Budget": {
    label: "Peacekeeping Budget (separate from regular budget)",
    bgColor: "bg-au-chico",
    textColor: "text-white",
    order: 0,
  },
  ...Object.fromEntries(
    PART_LABELS.map(([id, label], i) => [
      id,
      { label: `Part ${id} — ${label}`, ...PALETTE[i % PALETTE.length], order: i + 1 },
    ])
  ),
};

export function getGroupingStyles(lens: GroupingLens): Record<string, SystemGroupingStyle> {
  return lens === "priorityArea" ? priorityAreaStyles : budgetPartStyles;
}

export function getGroupStyle(
  lens: GroupingLens,
  key: string
): SystemGroupingStyle {
  return (
    getGroupingStyles(lens)[key] || {
      bgColor: "bg-gray-400",
      textColor: "text-white",
      order: 999,
      label: key,
    }
  );
}
