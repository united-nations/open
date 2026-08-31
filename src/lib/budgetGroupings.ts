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

import type {
  BudgetFundingSource as BudgetFundingSourceType,
  BudgetNode,
} from "@/types";
import type { SystemGroupingStyle } from "@/lib/systemGroupings";
import { PALETTE, budgetPartStyles } from "@/lib/secretariatGroupings";
import secretariatTaxonomies from "../../data/secretariat-taxonomies.json";

export type PpbLens = "budgetPart";
export type PpbGrouping = "section" | "entity";
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
    return secretariatTaxonomies.budget_unit_explanations.section_owner;
  }
  if (unit.isRemainder) {
    return secretariatTaxonomies.budget_unit_explanations.remainder;
  }
  if (unit.role === "section_scope") {
    return secretariatTaxonomies.budget_unit_explanations.section_scope;
  }
  if (unit.unitType === "special_purpose") {
    return secretariatTaxonomies.budget_unit_explanations.special_purpose;
  }
  return null;
}

/**
 * On what grounds the release ties an organization to a row. Every one of these
 * carries a link to the paragraph it was read from, which is why the page can
 * name the entity at all.
 */
export const ENTITY_RELATIONSHIP_NOTES: Record<string, string> =
  secretariatTaxonomies.entity_relationship_notes;

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
const costClassVisuals: Record<
  string,
  Pick<SystemGroupingStyle, "bgColor" | "textColor">
> = {
  military_police_personnel: {
    bgColor: "bg-un-blue",
    textColor: "text-white",
  },
  civilian_personnel: {
    bgColor: "bg-faded-jade",
    textColor: "text-white",
  },
  operational_costs: {
    bgColor: "bg-au-chico",
    textColor: "text-white",
  },
};

export const costClassStyles: Record<string, SystemGroupingStyle> =
  Object.fromEntries(
    secretariatTaxonomies.cost_classes.map(({ key, label, order }) => [
      key,
      { label, order, ...costClassVisuals[key] },
    ]),
  );

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
export const COST_CLASS_SHORT: Record<string, string> = Object.fromEntries(
  secretariatTaxonomies.cost_classes.map(({ key, short_label }) => [
    key,
    short_label,
  ]),
);

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
export type BudgetFundingSource = BudgetFundingSourceType;

export const BUDGET_FUNDING_SOURCES = secretariatTaxonomies.funding_sources
  .toSorted((a, b) => a.order - b.order)
  .map(({ key }) => key) as BudgetFundingSource[];

/** Funding-source shades used within a budget unit's base colour. */
export const FUNDING_SHADE_OPACITY: Record<BudgetFundingSource, number> = {
  regular_budget: 1,
  other_assessed: 1,
  extrabudgetary: 0.85,
};

const fundingSourceVisuals: Record<BudgetFundingSource, string> = {
  regular_budget: "bg-un-blue",
  other_assessed: "bg-un-blue",
  extrabudgetary: "bg-un-blue-dark",
};

export const FUNDING_SOURCES: Record<
  string,
  { label: string; color: string; tooltip: string }
> = Object.fromEntries(
  secretariatTaxonomies.funding_sources.map(({ key, label, tooltip }) => [
    key,
    {
      label,
      tooltip,
      color: fundingSourceVisuals[key as BudgetFundingSource],
    },
  ]),
);

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
