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

export type RegularBudgetPaymentStatus =
  | "paid_on_time"
  | "paid_late"
  | "not_paid_in_full";

export interface RegularBudgetContributor {
  name: string;
  assessment_rate: number;
  assessment_amount: number;
  payment_status: RegularBudgetPaymentStatus;
  payment_date: string | null;
}

export interface RegularBudgetContributorsData {
  meta: {
    year: number;
    as_of: string;
    due_date: string;
    member_state_count: number;
    assessment_total: number;
    assessment_amount_column: "Net contributions" | "Total contributions";
    paid_in_full_count: number;
    paid_on_time_count: number;
    paid_late_count: number;
    not_paid_in_full_count: number;
    amount_reconciliation: {
      checked_paid_states: number;
      exact_matches: number;
      discrepancies: {
        name: string;
        honour_roll_amount: number;
        assessment_document_amount: number;
      }[];
    };
    sources: {
      assessment_document: { symbol: string; url: string };
      honour_roll: { url: string; archive_url: string };
      scale: { url: string; workbook_url: string };
    };
  };
  contributors: RegularBudgetContributor[];
}

export interface TrustFundDestination {
  fund_code: string;
  fund_name: string;
  entity_code: string | null;
  entity_name: string | null;
  entity_id: string | null;
  amount_usd: number;
}

export interface TrustFundContributor {
  name: string;
  counterparty_group: "Government" | "Others" | "Mixed";
  amount_usd: number;
  positive_amount_usd: number;
  negative_amount_usd: number;
  reported_names: string[];
  destinations: TrustFundDestination[];
}

export interface TrustFundContributorsData {
  meta: {
    year: number;
    currency: "USD";
    measure: "Recognized voluntary contributions";
    statement_total_usd: number;
    named_rows_total_usd: number;
    contributor_total_usd: number;
    adjustment_total_usd: number;
    unallocated_residual_usd: number;
    named_row_completeness: number;
    unresolved_entity_amount_usd: number;
    source: { symbol: string; url: string };
    method_note: string;
    mapping_note: string;
  };
  contributors: TrustFundContributor[];
  adjustments: { label: string; amount_usd: number }[];
  reconciliation: {
    fund_code: string;
    statement_amount_usd: number;
    named_rows_amount_usd: number;
    residual_usd: number;
  }[];
}

export type SecretariatFundingSource =
  | "regular_budget"
  | "other_assessed"
  | "extrabudgetary";

export type SecretariatGroup = "secretariat" | "spm" | "pko" | "other";

export interface SecretariatGroupDefinition {
  label: string;
  color: string;
  text_color: string;
  order: number;
  field_legend: boolean;
}

export interface SecretariatOverviewCell {
  priority_area: string;
  funding_source: SecretariatFundingSource;
  amount: number;
}

export interface SecretariatOverviewEntity {
  code: string;
  total: number;
  primary_priority: string;
  split_across_priorities: boolean;
  group: SecretariatGroup;
  group_basis: string;
  cells: SecretariatOverviewCell[];
}

export interface SecretariatOverviewData {
  meta: {
    year: number;
    currency: "USD";
    measure: "expenses";
    total: number;
    priorities: string[];
    funding_sources: SecretariatFundingSource[];
    groups: Record<SecretariatGroup, SecretariatGroupDefinition>;
    classification_note: string;
    source: { label: string; url: string };
  };
  entities: SecretariatOverviewEntity[];
}

export interface SecretariatMissionLocation {
  code: string;
  name: string;
  kind: "pko" | "spm" | "support";
  area: string;
  areaKind: "country" | "territory" | "subnational" | "region";
  iso3: string | null;
  lat: number;
  long: number;
  certainty: "certain" | "approximate" | "contested";
  officeElsewhere?: boolean;
  note?: string;
}

export interface SecretariatEntitiesData {
  schema_version: 1;
  classification_note: string;
  groups: Record<SecretariatGroup, SecretariatGroupDefinition>;
  entities: Record<string, { group: SecretariatGroup; basis: string }>;
  aliases: Record<string, string>;
  map_notes: {
    placement: string;
    boundary_disclaimer: string;
    kashmir_disclaimer: string;
  };
  locations: SecretariatMissionLocation[];
  excluded_from_map: Array<{ code: string; reason: string }>;
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

// /secretariat page — budget-document treemaps distilled by python/12 from the
// `financial-data-v1.6` release of united-nations/programme-budget-data.
// One flat node list per view; `parentId` gives the hierarchy.

/**
 * The level of the chart a node sits at. The programme budget runs
 * whole -> part -> section -> budget unit -> detail; the budget-unit tier is
 * the one the treemap draws as tiles, and it is the same kind of thing in
 * every section, which the rows below it are not.
 */
export type BudgetNodeTier =
  | "whole"
  | "part"
  | "section"
  | "budget_unit"
  | "detail"
  | "mission"
  | "class"
  | "item";

export type BudgetNodeKind =
  // Programme budget: the whole, its parts and sections, then what the fascicle
  // calls the rows below them.
  | "whole"
  | "part"
  | "section"
  | "entity"
  | "programme"
  | "component"
  | "subprogramme"
  | "allocation"
  // Peacekeeping: mission, cost class, cost item.
  | "mission"
  | "class"
  | "item";

/** What a budget unit is: a heading the fascicle prints, or a generated wrapper. */
export type BudgetUnitType =
  | "entity"
  | "programme"
  | "special_purpose"
  | "unassigned";

/** Why a budget unit exists, which is what decides how it may be labelled. */
export type BudgetUnitRole =
  | "source_node"
  | "section_scope"
  | "special_purpose"
  | "coverage_remainder";

/**
 * An organization the release ties to this row, from the source-evidenced
 * entity dimension. `relationship` says on what grounds: `direct_financial_entity`
 * is a heading the fascicle prints for this very row, `section_owner` is the one
 * organization the release says owns the whole section.
 */
export interface BudgetNodeEntity {
  name: string;
  acronym: string | null;
  relationship: string;
  evidenceUrl?: string | null;
}

export interface BudgetNodeSource {
  symbol: string;
  url: string;
  /** Physical PDF page, when independently located by the producer. */
  pdfPage?: number | null;
  pageStatus?: string | null;
  rowLabel: string;
  columnHeader: string;
  tableTitle?: string | null;
}

export type BudgetFundingSource =
  | "regular_budget"
  | "other_assessed"
  | "extrabudgetary";

export type BudgetSourceLens = BudgetFundingSource | "total_all_sources";

export type BudgetMetricKey = "expenditure" | "approved" | "proposed";

export interface BudgetMetricDefinition {
  label: string;
  description: string;
  dataYear: number;
  yearOffset: number;
  total: number;
  sourceEdition?: number;
  sourceDocument?: string;
}

export interface BudgetNodeBreakdown {
  /** Sum of the displayed immediate children, where it can be tested. */
  childAmount: number | null;
  /** Parent minus immediate children. */
  difference: number | null;
  outcome: string;
  completeness?: string;
}

export interface BudgetNode {
  id: string;
  parentId: string | null;
  /** Which level of the chart this is. */
  tier: BudgetNodeTier;
  /** What the budget document calls the row. */
  kind: BudgetNodeKind;
  code: string | null;
  label: string;
  /** Full dollars. */
  amount: number;
  /** "printed"/"directly_printed" = in the source document; otherwise derived. */
  basis: string;
  /** Producer's authoritative all-source amount, before UI funding filters. */
  allSourcesAmount?: number;
  /** Sum of the separately published RB/OA/XB values. */
  fundingBreakdownTotal?: number;
  /** allSourcesAmount minus fundingBreakdownTotal. */
  fundingDifference?: number;
  /** The same amount split by funding source, where the source publishes it. */
  values?: Partial<Record<BudgetFundingSource, number>>;
  /** The same stable PPB hierarchy valued under each published budget lens. */
  metricValues?: Partial<
    Record<BudgetMetricKey, Partial<Record<BudgetFundingSource, number>>>
  >;
  metricAmounts?: Partial<Record<BudgetMetricKey, number>>;
  /** Source reconciliation by funding lens, retained separately from spend. */
  breakdowns?: Partial<
    Record<
      | "regular_budget"
      | "other_assessed"
      | "extrabudgetary"
      | "total_all_sources"
      | "selected_funding_sources",
      BudgetNodeBreakdown
    >
  >;
  /** Reconciliation for the funding sources currently selected in the UI. */
  breakdown?: BudgetNodeBreakdown;
  completeness?: string;
  /** The document prints this row as a lump, without itemizing it. */
  isRemainder?: boolean;
  /** What the release says about how this figure was arrived at. */
  note?: string;
  /** Budget units only. */
  unitType?: BudgetUnitType;
  role?: BudgetUnitRole;
  /** The organization the release ties to this row, where it names one. */
  entity?: BudgetNodeEntity;
  /** Sections only: the release's verdict on who owns the section, and why. */
  entityStatus?: string;
  entityNote?: string;
  /** PKO only. */
  mission?: string;
  costClass?: string;
  /** Producer-designated source for each numeric PPB funding lens. */
  sources?: Partial<Record<BudgetSourceLens, BudgetNodeSource>>;
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

/** How much of the year is covered by the release's entity dimension. */
export interface BudgetEntityDimension {
  entities: number;
  sections: number;
  relationships: number;
  printedFinancialEntities?: number;
  sectionsWithoutSingleEntity?: number;
  unresolvedPrintedFinancialEntities?: number;
  /** Budget units this portal could name, out of the units it draws. */
  namedUnits: number;
  units: number;
  producer: string;
  producerGitHead: string;
  sourceFiles: Array<{ path: string; sha256: string }>;
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
  stream: "ppb" | "pko" | "trust_funds";
  /** Whether the tree comes from audited actuals or budget documents. */
  sourceKind?: "audited" | "budget_document" | "trust_fund_schedule";
  title: string;
  label: string;
  measure: string;
  /** Expenditure year (PPB), or the first year of the July-June cycle (PKO). */
  year: number;
  /** How the year is written: "2023", or "2024/25" for peacekeeping. */
  fiscalYear: string;
  currency: string;
  total: number;
  metrics?: Partial<Record<BudgetMetricKey, BudgetMetricDefinition>>;
  metricCoverage?: {
    budgetUnits: number;
    byMetric: Partial<Record<BudgetMetricKey, number>>;
  };
  sourceNote?: string;
  sourceEdition?: number;
  sourcePublicationYear?: number;
  sourceDocument?: string;
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
  /** Dataset-specific display names for the shared funding-source keys. */
  fundingLabels?: Record<string, string>;
  costClasses?: Record<string, string>;
  missionNames?: Record<string, string>;
  coverage?: BudgetCoverage;
  /** Source-evidenced organization lookup for every displayed PPB edition. */
  entityDimension?: BudgetEntityDimension | null;
  omitted?: BudgetOmission[];
  verification?: Record<string, string>;
  source: { repo: string; release: string; url: string };
}

export interface BudgetData {
  meta: BudgetMeta;
  nodes: BudgetNode[];
}
