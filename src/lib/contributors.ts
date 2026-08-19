export type ContributorStatus = "member" | "observer" | "nonmember" | "organization";

export interface Contributor {
  name: string;
  status: ContributorStatus;
  category: string;  // Donor category (Government, Foundations, Private Sector, etc.)
  contributions: Record<string, Record<string, number>>;
  is_other?: boolean;  // Aggregated "Other X" entries (not clickable)
}

export interface ContributorData {
  status: ContributorStatus;
  category: string;  // Donor category (Government, Foundations, Private Sector, etc.)
  contributions: Record<string, Record<string, number>>;
  is_other?: boolean;  // Aggregated "Other X" entries (not clickable)
}

// Short display labels for contributor categories
export const CATEGORY_LABELS: Record<string, string> = {
  "Government": "Government",
  "Non-Government": "Non-Gov",
  "NGOs": "NGO",
  "Foundations": "Foundation",
  "Private Sector": "Private",
  "Academic": "Academic",
  "European Union": "EU",
  "Multilateral - IFIs": "IFI",
  "Multilateral - Global Funds": "Global Fund",
  "Multilateral - UN Orgs": "UN Org",
  "Multilateral - UN Pooled Funds": "UN Pooled",
  "Multilateral - Other": "Multilateral",
  "Other Contributors": "Other",
  "No Contributor": "N/A",
  "Other": "Other",
  "Unattributed": "Unattributed",
};

// Unattributed is a special category for revenue where we don't know the source
export const isUnattributed = (contributor: Contributor): boolean => {
  return contributor.name === "Unattributed";
};

export const getStatusStyle = (status: string) => {
  switch (status) {
    case "member":
      return {
        bgColor: "bg-un-blue",
        textColor: "text-white",
        label: "Member State",
        order: 1,
      };
    case "observer":
      return {
        bgColor: "bg-[#4db8e8]",
        textColor: "text-white",
        label: "Observer State",
        order: 2,
      };
    case "nonmember":
      return {
        bgColor: "bg-[#99d6f2]",
        textColor: "text-gray-800",
        label: "Non-Member State",
        order: 3,
      };
    case "organization":
      return {
        bgColor: "bg-smoky",
        textColor: "text-white",
        label: "Non-Government",
        order: 4,
      };
    default:
      return {
        bgColor: "bg-gray-500",
        textColor: "text-white",
        label: "Unknown",
        order: 999,
      };
  }
};

export const isGovernmentDonor = (status: ContributorStatus): boolean => {
  return status === "member" || status === "observer" || status === "nonmember";
};

export const getTotalContributions = (
  contributions: Record<string, Record<string, number>>
): number => {
  return Object.values(contributions).reduce((total, entityContributions) => {
    return (
      total +
      Object.values(entityContributions).reduce(
        (sum, amount) => sum + amount,
        0
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
  if (type === "Assessed") return 1;
  if (type === "Voluntary un-earmarked") return 2;
  if (type === "Voluntary earmarked") return 3;
  if (type === "Other") return 4;
  return 5;
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

export const CONTRIBUTION_TYPES = [
  { type: "Assessed", label: "Assessed", opacity: "opacity-100", bgColor: "bg-un-blue-muted" },
  { type: "Voluntary un-earmarked", label: "Voluntary un-earmarked", opacity: "opacity-80", bgColor: "bg-un-blue-muted/80" },
  { type: "Voluntary earmarked", label: "Voluntary earmarked", opacity: "opacity-60", bgColor: "bg-un-blue-muted/60" },
  { type: "Other", label: "Other", opacity: "opacity-40", bgColor: "bg-un-blue-muted/40" },
] as const;
