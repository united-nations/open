import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
import organizationTaxonomies from "../../data/organization-taxonomies.json";

export type ContributorStatus =
  | "member"
  | "observer"
  | "nonmember"
  | "organization";

export type ContributorRecordKind =
  | "reported_named"
  | "reported_aggregate"
  | "calculated_balance";
export type ContributorAmounts = Record<string, Record<string, number>>;

export interface UnresolvedFinancingRecord {
  entity: string;
  amount: number;
  sourceCode: string;
  category: string;
  sourceCategory?: string;
  sourceRow?: number;
}

export interface Contributor extends ContributorData {
  name: string;
}

export interface ContributorYearAmounts {
  year: number;
  available?: boolean;
  financingIncomplete?: boolean;
  assessed: number;
  voluntary_unearmarked: number;
  voluntary_earmarked: number;
  other: number;
}

/** Preserve missing periods as gaps, while keeping complete control series visible. */
export function contributorFinancingPoint(
  point: ContributorYearAmounts,
  scopeAvailable = true,
) {
  const known =
    scopeAvailable && point.available !== false && !point.financingIncomplete;
  return {
    year: String(point.year),
    Assessed: known ? point.assessed : null,
    "Voluntary un-earmarked": known ? point.voluntary_unearmarked : null,
    "Voluntary earmarked": known ? point.voluntary_earmarked : null,
    Other: known ? point.other : null,
  };
}

export interface ContributorData {
  status: ContributorStatus;
  category: string;
  contributions: ContributorAmounts;
  categories?: string[];
  categoryContributions?: Record<string, ContributorAmounts>;
  record_kind?: ContributorRecordKind;
  is_other?: boolean;
  unresolvedContributions?: Record<string, number>;
  unresolvedFinancingRecords?: UnresolvedFinancingRecord[];
  unresolvedTotal?: number;
  financingIncomplete?: boolean;
}

export const contributorOriginLabel = (kind?: ContributorRecordKind): string =>
  kind === "reported_aggregate"
    ? "Reported aggregate"
    : kind === "calculated_balance"
      ? "Calculated balance"
      : "Reported contributor";

/** A contributor keeps one identity while its observations retain their categories. */
export function contributorCategoryViews(
  contributor: Contributor,
): Contributor[] {
  const categories = Object.entries(contributor.categoryContributions ?? {});
  if (!categories.length) return [contributor];
  return categories.map(([category, contributions]) => ({
    ...contributor,
    category,
    contributions,
    status:
      category === "Government"
        ? isGovernmentDonor(contributor.status)
          ? contributor.status
          : "nonmember"
        : "organization",
  }));
}

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

// Financing-control balance not assigned to the available contributor detail.
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

export const formatBudget = sharedFormatBudget;

export const getDisplayName = (name: string): string => {
  return name.trim();
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
