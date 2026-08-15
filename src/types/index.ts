export interface Entity {
  entity: string;
  entity_long: string;
  entity_combined: string;
  entity_description: string | null;
  entity_link: string;
  entity_link_is_un_org: number;
  system_grouping: string;
  category: string;
  un_principal_organ: string | string[];
  un_pillar: string | null;
  is_ceb_member: boolean | null;
  head_of_entity_level: string | null;
  head_of_entity_title_specific: string | null;
  head_of_entity_title_general: string | null;
  head_of_entity_name: string | null;
  head_of_entity_bio: string | null;
  head_of_entity_headshot: string | null;
  global_leadership_team_url: string | null;
  on_display: string;
  foundational_mandate: string | null;
  organizational_chart_link: string | null;
  budget_financial_reporting_link: string | null;
  results_framework_link: string | null;
  strategic_plan_link: string | null;
  annual_reports_link: string | null;
  transparency_portal_link: string | null;
  socials_linkedin: string | null;
  socials_twitter: string | null;
  socials_instagram: string | null;
  entity_news_page: string | null;
  entity_branding_page: string | null;
  entity_data_page: string | null;
  entity_logo_page: string | null;
  entity_wikipedia_page: string | null;
}

export interface Impact {
  id: number;
  entity: string;
  highlight: string;
  impact: string;
}

export interface BudgetEntry {
  entity: string;
  source: string;
  year?: number;
  amount: number;
}

export interface DonorContribution {
  donor: string;
  total: number;
  Assessed?: number;
  "Voluntary earmarked"?: number;
  "Voluntary un-earmarked"?: number;
  Other?: number;
}

export interface EntityRevenue {
  total: number;
  year: number;
  by_type: Record<string, number>;
  by_donor: DonorContribution[];
}

export interface CountryExpense {
  iso3: string;
  name: string;
  region: string;
  lat: number;
  long: number;
  total: number;
  entities: Record<string, number>;
}

export interface EntitySpendingBreakdown {
  byCountry: { name: string; iso3: string; amount: number }[];
  bySDG: { sdg: number; amount: number }[];
}

// /secretariat page (data/un-secretariat-expenses.csv)
export interface SecretariatRecord {
  entity: string;
  priority_area: string;
  part_id: string;
  part_desc: string;
  /** Budget section, the level between the part and the entity. */
  section_id: string;
  section_desc: string;
  amount: number;
}

export interface SecretariatFund {
  label: string;
  source_type: string;
  amount: number;
}

export interface SecretariatData {
  records: SecretariatRecord[];
  funds: Record<string, SecretariatFund[]>;
}

// /secretariat page — budget-document treemaps distilled by python/12 from the
// `financial-data-v1.1` release of united-nations/programme-budget-data.
// One flat node list per view; `parentId` gives the hierarchy.
export type BudgetNodeKind =
  // Programme budget: the whole, its parts and sections, then whatever the
  // fascicle itemizes below a section.
  | "whole"
  | "part"
  | "section"
  | "entity"
  | "component"
  | "subprogramme"
  | "allocation"
  // Peacekeeping: mission, cost class, cost item.
  | "mission"
  | "class"
  | "item";

export interface BudgetNodeSource {
  symbol: string;
  url: string;
  rowLabel: string;
  columnHeader: string;
}

export interface BudgetNode {
  id: string;
  parentId: string | null;
  kind: BudgetNodeKind;
  code: string | null;
  label: string;
  /** Full dollars. */
  amount: number;
  /** "printed"/"directly_printed" = in the source document; otherwise derived. */
  basis: string;
  /** PPB only: the same amount split by funding source. */
  values?: Partial<Record<"regular_budget" | "other_assessed" | "extrabudgetary", number>>;
  completeness?: string;
  /** The document prints this row as a lump, without itemizing it. */
  isRemainder?: boolean;
  /** What the release says about how this figure was arrived at. */
  note?: string;
  /** PKO only. */
  mission?: string;
  costClass?: string;
  source?: BudgetNodeSource;
}

export interface BudgetCoverage {
  missionsInCycleReference?: number;
  missionsDisplayed?: number;
  displayedMissionCodes?: string[];
  missingCanonicalDetail?: string[];
  noPublishedValueForLens?: string[];
  completeness?: string;
}

/** A node the budget document publishes only in part, so it cannot be drawn. */
export interface BudgetOmission {
  kind: BudgetNodeKind;
  code: string | null;
  label: string;
  values: Record<string, number>;
  reason: string;
}

export interface BudgetMeta {
  stream: "ppb" | "pko";
  title: string;
  label: string;
  measure: string;
  /** Expenditure year (PPB), or the first year of the July-June cycle (PKO). */
  year: number;
  /** How the year is written: "2023", or "2024/25" for peacekeeping. */
  fiscalYear: string;
  currency: string;
  total: number;
  scopeLabel: string;
  scopeWarning: string;
  /** True when the year publishes only some of the funding sources. */
  partial?: boolean;
  fundingStates?: Record<string, string>;
  edition?: number;
  cycle?: number;
  documentSymbol?: string | null;
  documentUrl?: string | null;
  fundingSources?: string[];
  costClasses?: Record<string, string>;
  missionNames?: Record<string, string>;
  coverage?: BudgetCoverage;
  omitted?: BudgetOmission[];
  verification?: Record<string, string>;
  source: { repo: string; release: string; url: string };
}

export interface BudgetData {
  meta: BudgetMeta;
  nodes: BudgetNode[];
}
