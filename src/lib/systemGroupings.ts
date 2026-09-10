import organizationTaxonomies from "../../data/organization-taxonomies.json";

// Centralized system grouping configuration
// Defines visual styling and metadata for each system grouping used in the entities treemap

export interface SystemGroupingStyle {
  bgColor: string;
  textColor: string;
  hexColor?: string;
  order: number;
  label: string;
}

type SystemGroupingVisual = Pick<
  SystemGroupingStyle,
  "bgColor" | "textColor" | "hexColor"
>;

// Visual choices belong to the website. Keys, labels, and ordering come from
// the shared organization taxonomy in data/.
const systemGroupingVisuals: Record<string, SystemGroupingVisual> = {
  "UN Secretariat": {
    bgColor: "bg-open-system-category-secretariat",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-secretariat)",
  },
  // Both peacekeeping keys share one short label: only one of them carries
  // entities at a time, so the legend must not show the pair as two entries.
  "Peacekeeping Operations and Political Missions": {
    bgColor: "bg-open-system-category-peacekeeping",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-peacekeeping)",
  },
  // Peacekeeping category
  "Peacekeeping Operations": {
    bgColor: "bg-open-system-category-peacekeeping",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-peacekeeping)",
  },
  "Regional Commissions": {
    bgColor: "bg-open-system-category-regional-commissions",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-regional-commissions)",
  },
  "Funds and Programmes": {
    bgColor: "bg-open-system-category-funds-programmes",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-funds-programmes)",
  },
  "Research and Training": {
    bgColor: "bg-open-system-category-research-training",
    textColor: "text-black",
    hexColor: "var(--color-open-system-category-research-training)",
  },
  "Subsidiary Organs": {
    bgColor: "bg-open-system-category-neutral",
    textColor: "text-black",
    hexColor: "var(--color-open-system-category-neutral)",
  },
  "International Court of Justice": {
    bgColor: "bg-open-system-category-neutral",
    textColor: "text-black",
    hexColor: "var(--color-open-system-category-neutral)",
  },
  "Intergovernmental and Expert Bodies": {
    bgColor: "bg-open-system-category-neutral",
    textColor: "text-black",
    hexColor: "var(--color-open-system-category-neutral)",
  },
  "Specialized Agencies": {
    bgColor: "bg-open-system-category-specialized-agencies",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-specialized-agencies)",
  },
  "Related Organizations": {
    bgColor: "bg-open-system-category-related-organizations",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-related-organizations)",
  },
  "Other Entities": {
    bgColor: "bg-open-system-category-other-entities",
    textColor: "text-white",
    hexColor: "var(--color-open-system-category-other-entities)",
  },
  "Other Bodies": {
    bgColor: "bg-open-system-category-neutral",
    textColor: "text-black",
    hexColor: "var(--color-open-system-category-neutral)",
  },
  "Uncategorized": {
    bgColor: "bg-open-system-category-neutral",
    textColor: "text-black",
    hexColor: "var(--color-open-system-category-neutral)",
  },
};

const fallbackVisual: SystemGroupingVisual = {
  bgColor: "bg-open-system-category-neutral",
  textColor: "text-black",
  hexColor: "var(--color-open-system-category-neutral)",
};

export const systemGroupingStyles: Record<string, SystemGroupingStyle> =
  Object.fromEntries(
    organizationTaxonomies.system_groupings.map(({ key, label, order }) => [
      key,
      { label, order, ...(systemGroupingVisuals[key] ?? fallbackVisual) },
    ]),
  );

/**
 * Get style configuration for a system grouping
 * Falls back to default gray styling if grouping is not found
 */
export function getSystemGroupingStyle(grouping: string): SystemGroupingStyle {
  return (
    systemGroupingStyles[grouping] || {
      ...fallbackVisual,
      order: 999,
      label: grouping,
    }
  );
}

/**
 * Get all system groupings sorted by their order
 */
export function getSortedSystemGroupings(): Array<
  [string, SystemGroupingStyle]
> {
  return Object.entries(systemGroupingStyles).sort(
    ([, a], [, b]) => a.order - b.order,
  );
}
