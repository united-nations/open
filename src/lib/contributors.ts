import organizationTaxonomies from "../../data/organization-taxonomies.json";

export type ContributorStatus =
  | "member"
  | "observer"
  | "nonmember"
  | "organization";

export interface Contributor {
  name: string;
  status: ContributorStatus;
  category: string; // Donor category (Government, Foundations, Private Sector, etc.)
  contributions: Record<string, Record<string, number>>;
  is_other?: boolean; // Aggregated "Other X" entries (not clickable)
}

export interface ContributorData {
  status: ContributorStatus;
  category: string; // Donor category (Government, Foundations, Private Sector, etc.)
  contributions: Record<string, Record<string, number>>;
  is_other?: boolean; // Aggregated "Other X" entries (not clickable)
}

// Short display labels for contributor categories
export const CATEGORY_LABELS: Record<string, string> =
  organizationTaxonomies.contributor_categories;

const contributorStatusMetadata = Object.fromEntries(
  organizationTaxonomies.contributor_statuses.map(({ key, label, order }) => [
    key,
    { label, order },
  ]),
);

const contributorStatusVisuals: Record<
  string,
  { bgColor: string; textColor: string }
> = {
  member: { bgColor: "bg-un-blue", textColor: "text-white" },
  observer: { bgColor: "bg-[#4db8e8]", textColor: "text-white" },
  nonmember: { bgColor: "bg-[#99d6f2]", textColor: "text-gray-800" },
  organization: { bgColor: "bg-smoky", textColor: "text-white" },
};

// Unattributed is a special category for revenue where we don't know the source
export const isUnattributed = (contributor: Contributor): boolean => {
  return contributor.name === "Unattributed";
};

export const getStatusStyle = (status: string) => {
  const metadata = contributorStatusMetadata[status];
  const visual = contributorStatusVisuals[status];
  return metadata && visual
    ? { ...visual, ...metadata }
    : {
        bgColor: "bg-gray-500",
        textColor: "text-white",
        label: "Unknown",
        order: 999,
      };
};

export const isGovernmentDonor = (status: ContributorStatus): boolean => {
  return status === "member" || status === "observer" || status === "nonmember";
};

export const getTotalContributions = (
  contributions: Record<string, Record<string, number>>,
): number => {
  return Object.values(contributions).reduce((total, entityContributions) => {
    return (
      total +
      Object.values(entityContributions).reduce(
        (sum, amount) => sum + amount,
        0,
      )
    );
  }, 0);
};

export const formatBudget = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

export const getDisplayName = (name: string): string => {
  return name
    .replace(/\([^)]*\)/g, "")
    .replace(/\*/g, "")
    .replace(/Special Administrative Region/gi, "SAR")
    .trim();
};

export const getContributionTypeOrder = (type: string): number => {
  return (
    organizationTaxonomies.financing_instruments.find(
      (instrument) => instrument.key === type,
    )?.order ?? 5
  );
};

// Opacity classes for use with a base color
export const getContributionTypeColor = (type: string): string => {
  if (type === "Assessed") return "opacity-100";
  if (type === "Voluntary un-earmarked") return "opacity-80";
  if (type === "Voluntary earmarked") return "opacity-60";
  if (type === "Other") return "opacity-40";
  return "opacity-50";
};

// Background color classes for charts and sidebars
export const getContributionTypeBgColor = (type: string): string => {
  if (type === "Assessed") return "bg-un-blue-muted";
  if (type === "Voluntary un-earmarked") return "bg-un-blue-muted/80";
  if (type === "Voluntary earmarked") return "bg-un-blue-muted/60";
  if (type === "Other") return "bg-un-blue-muted/40";
  return "bg-gray-500";
};

export const CONTRIBUTION_TYPES = organizationTaxonomies.financing_instruments
  .toSorted((a, b) => a.order - b.order)
  .map(({ key, label }) => ({
    type: key,
    label,
    opacity: getContributionTypeColor(key),
    bgColor: getContributionTypeBgColor(key),
  }));
