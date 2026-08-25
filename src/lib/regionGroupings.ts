import organizationTaxonomies from "../../data/organization-taxonomies.json";

// Centralized region grouping configuration
// Defines visual styling and metadata for each CEB region used in the country treemap

export interface RegionStyle {
  bgColor: string;
  textColor: string;
  order: number;
  label: string;
}

const regionVisuals: Record<
  string,
  Pick<RegionStyle, "bgColor" | "textColor">
> = {
  Africa: {
    bgColor: "bg-camouflage-green",
    textColor: "text-white",
  },
  Asia: {
    bgColor: "bg-au-chico",
    textColor: "text-white",
  },
  Americas: {
    bgColor: "bg-smoky",
    textColor: "text-white",
  },
  Europe: {
    bgColor: "bg-shuttle-gray",
    textColor: "text-white",
  },
  Oceania: {
    bgColor: "bg-trout",
    textColor: "text-white",
  },
  "Global and Interregional": {
    bgColor: "bg-gray-500",
    textColor: "text-white",
  },
};

const fallbackVisual = {
  bgColor: "bg-gray-400",
  textColor: "text-white",
};

export const regionStyles: Record<string, RegionStyle> = Object.fromEntries(
  organizationTaxonomies.regions.map(({ key, label, order }) => [
    key,
    { label, order, ...(regionVisuals[key] ?? fallbackVisual) },
  ]),
);

/**
 * Get style configuration for a region
 * Falls back to default gray styling if region is not found
 */
export function getRegionStyle(region: string): RegionStyle {
  return (
    regionStyles[region] || {
      bgColor: "bg-gray-400",
      textColor: "text-white",
      order: 999,
      label: region,
    }
  );
}

/**
 * Get all regions sorted by their order
 */
export function getSortedRegions(): Array<[string, RegionStyle]> {
  return Object.entries(regionStyles).sort(([, a], [, b]) => a.order - b.order);
}
