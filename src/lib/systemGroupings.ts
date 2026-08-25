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
    bgColor: "bg-gray-300",
    textColor: "text-black",
    hexColor: "#d1d5db",
  },
  // Both peacekeeping keys share one short label: only one of them carries
  // entities at a time, so the legend must not show the pair as two entries.
  "Peacekeeping Operations and Political Missions": {
    bgColor: "bg-au-chico",
    textColor: "text-white",
    hexColor: "#a0665c",
  },
  // Synthetic grouping for the UN-DPO CEB aggregate
  "Peacekeeping Operations": {
    bgColor: "bg-au-chico",
    textColor: "text-white",
    hexColor: "#a0665c",
  },
  "Regional Commissions": {
    bgColor: "bg-smoky",
    textColor: "text-white",
    hexColor: "#6c5b7b",
  },
  "Funds and Programmes": {
    bgColor: "bg-camouflage-green",
    textColor: "text-white",
    hexColor: "#7d8471",
  },
  "Research and Training": {
    bgColor: "bg-camouflage-green",
    textColor: "text-white",
    hexColor: "#7d8471",
  },
  "Subsidiary Organs": {
    bgColor: "bg-trout",
    textColor: "text-white",
    hexColor: "#495057",
  },
  "International Court of Justice": {
    bgColor: "bg-shuttle-gray",
    textColor: "text-white",
    hexColor: "#5a6c7d",
  },
  "Intergovernmental and Expert Bodies": {
    bgColor: "bg-gray-500",
    textColor: "text-white",
    hexColor: "#6b7280",
  },
  "Specialized Agencies": {
    bgColor: "bg-shuttle-gray",
    textColor: "text-white",
    hexColor: "#5a6c7d",
  },
  "Related Organizations": {
    bgColor: "bg-black",
    textColor: "text-white",
    hexColor: "#1f2937",
  },
  "Other Entities": {
    bgColor: "bg-gray-500",
    textColor: "text-white",
    hexColor: "#6b7280",
  },
  "Other Bodies": {
    bgColor: "bg-pale-oyster",
    textColor: "text-white",
    hexColor: "#9b8b7a",
  },
  Uncategorized: {
    bgColor: "bg-gray-400",
    textColor: "text-black",
    hexColor: "#9ca3af",
  },
};

const fallbackVisual: SystemGroupingVisual = {
  bgColor: "bg-gray-400",
  textColor: "text-white",
  hexColor: "#9ca3af",
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
      bgColor: "bg-gray-400",
      textColor: "text-white",
      hexColor: "#9ca3af",
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
