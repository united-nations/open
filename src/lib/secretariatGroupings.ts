// Visual styling for the two grouping lenses on the /secretariat page:
// - Priority Area (9 thematic areas)
// - Budget Part (formal budget structure, Parts I-XIV, keyed by part_id)
// Reuses the SystemGroupingStyle shape from systemGroupings.ts.

import type { SystemGroupingStyle } from "@/lib/systemGroupings";

export type GroupingLens = "priorityArea" | "budgetPart";

// Shared palette of theme bg classes (UN palette) with readable text colors.
const PALETTE: Array<{ bgColor: string; textColor: string }> = [
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
