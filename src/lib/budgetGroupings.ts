// Grouping configuration for the budget-document treemaps on /secretariat
// (data written by python/12-export_budget_json.py).
//
// Each treemap draws one level of the tree as tiles, grouped and colored by the
// level above (or, for peacekeeping, by cost class). The lenses are:
//   Programme budget  budget units, grouped by section, banded by budget part
//   Peacekeeping      cost classes, grouped by mission -or- by cost class
//
// The Budget-Part colors are the ones the older Secretariat treemap already
// uses, so the two pages stay recognizable.

import type { BudgetNode } from "@/types";
import type { SystemGroupingStyle } from "@/lib/systemGroupings";
import { PALETTE, budgetPartStyles } from "@/lib/secretariatGroupings";

export type PpbLens = "budgetPart";
export type PkoLens = "mission" | "costClass";
export type BudgetLens = PpbLens | PkoLens;

/** Palette styles for an ordered list of group keys (first key = first color). */
export function buildOrderedStyles(
  keys: string[],
  labels: Record<string, string> = {},
): Record<string, SystemGroupingStyle> {
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      {
        label: labels[key] ?? key,
        ...PALETTE[i % PALETTE.length],
        order: i + 1,
      },
    ]),
  );
}

/** Budget parts, keyed by Roman numeral, as emitted by python/12. */
export const partStyles: Record<string, SystemGroupingStyle> = budgetPartStyles;

/**
 * What to write on a budget-unit tile.
 *
 * The unit is the same kind of thing in every section, but it is not always
 * named the same way. Where the release ties the unit to an organization, that
 * organization is what the tile is: the acronym if it has one, because a tile is
 * a few centimetres wide and "UNHCR" is read where the full name is truncated.
 * A generated wrapper standing for the section as a whole is the section, so it
 * takes the section's name. Only a remainder keeps its own wording, because
 * "not itemized" is the honest thing to write on it.
 */
export function unitCaption(
  unit: BudgetNode,
  section: BudgetNode | undefined,
): string {
  if (unit.entity) return unit.entity.acronym ?? unit.entity.name;
  if (unit.role === "section_scope" && section) return section.label;
  return unit.label;
}

/**
 * What a budget unit is, in one sentence, for the tooltip and the sidebar.
 *
 * A tile drawn from a heading the fascicle prints needs no explanation. The
 * generated ones do: the reader is owed the difference between "this is what
 * the document says" and "this is what is left once the named parts are taken
 * out".
 */
export function unitExplanation(unit: BudgetNode): string | null {
  if (unit.entity?.relationship === "section_owner") {
    return "The budget document does not print a heading for this row. The whole section belongs to this one organization, so the amount is its.";
  }
  if (unit.isRemainder) {
    return "The document prints this as a lump, without saying what is inside it.";
  }
  if (unit.role === "section_scope") {
    return "Everything the section spends without putting it under a named entity.";
  }
  if (unit.unitType === "special_purpose") {
    return "Allocations the section keeps apart from its regular work.";
  }
  return null;
}

/**
 * On what grounds the release ties an organization to a row. Every one of these
 * carries a link to the paragraph it was read from, which is why the page can
 * name the entity at all.
 */
export const ENTITY_RELATIONSHIP_NOTES: Record<string, string> = {
  audited_entity:
    "the audited extract assigns these source rows to this entity",
  direct_financial_entity:
    "the budget prints this row under the entity's own heading",
  section_owner:
    "the release names it the one organization the section belongs to",
  organizational_unit:
    "the release names it an organizational unit of the section",
  implementing_entity:
    "the release names it as implementing the section's work",
  project_responsibility: "the release names it responsible for the project",
};

/** Everything a tile can be searched by, including names it does not display. */
export function unitSearchText(
  unit: BudgetNode,
  section: BudgetNode | undefined,
): string {
  return [
    unit.label,
    unit.code,
    unit.entity?.name,
    unit.entity?.acronym,
    section?.label,
    section?.code,
  ]
    .filter(Boolean)
    .join(" ");
}

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
export const COST_CLASS_BAND_COLORS: Record<
  string,
  { bg: string; hover: string }
> = {
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

/** Audited PKO files are keyed by the calendar year in which the cycle ends. */
export function auditedFiscalYearLabel(year: number): string {
  return `${year - 1}/${String(year).slice(2)}`;
}

/** The funding sources of the programme budget, in the order the fascicles use. */
export const BUDGET_FUNDING_SOURCES = [
  "regular_budget",
  "other_assessed",
  "extrabudgetary",
] as const;

export type BudgetFundingSource = (typeof BUDGET_FUNDING_SOURCES)[number];

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
    color: "bg-un-blue",
    tooltip:
      "Separately assessed budgets, chiefly peacekeeping and the tribunals",
  },
  extrabudgetary: {
    label: "Extrabudgetary",
    color: "bg-un-blue-dark",
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
  key: string,
): SystemGroupingStyle {
  return styles[key] ?? { ...FALLBACK_STYLE, label: key };
}
