import { Entity, BudgetEntry } from "@/types";

export const UNCATEGORIZED_SYSTEM_GROUP = "Uncategorized";

/**
 * Keep entities with incomplete metadata visible until they receive a curated
 * system grouping.
 */
export function normalizeEntityForDisplay(entity: Entity): Entity {
  if (entity.system_grouping) return entity;
  return {
    ...entity,
    system_grouping: UNCATEGORIZED_SYSTEM_GROUP,
  };
}

/**
 * Create the minimum metadata needed to render a financial entity that has no
 * matching Airtable record. These placeholders remain visibly uncategorized
 * instead of silently dropping out of entity views.
 */
export function createUncategorizedEntity(entityCode: string): Entity {
  return {
    entity: entityCode,
    entity_long: entityCode,
    entity_combined: entityCode,
    entity_description: null,
    entity_link: "",
    entity_link_is_un_org: 0,
    system_grouping: UNCATEGORIZED_SYSTEM_GROUP,
    category: UNCATEGORIZED_SYSTEM_GROUP,
    un_principal_organ: [],
    un_pillar: null,
    is_ceb_member: null,
    head_of_entity_level: null,
    head_of_entity_title_specific: null,
    head_of_entity_title_general: null,
    head_of_entity_name: null,
    head_of_entity_bio: null,
    head_of_entity_headshot: null,
    global_leadership_team_url: null,
    on_display: "True",
    foundational_mandate: null,
    organizational_chart_link: null,
    budget_financial_reporting_link: null,
    results_framework_link: null,
    strategic_plan_link: null,
    annual_reports_link: null,
    transparency_portal_link: null,
    socials_linkedin: null,
    socials_twitter: null,
    socials_instagram: null,
    entity_news_page: null,
    entity_branding_page: null,
    entity_data_page: null,
    entity_logo_page: null,
    entity_wikipedia_page: null,
  };
}

/**
 * Format budget amount as currency
 */
export const formatBudget = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
};

/**
 * Create a URL-safe slug from entity name
 */
export function createEntitySlug(entityName: string): string {
  return entityName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "-")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Find entity by matching original name to slug
 */
export function findEntityBySlug(
  entities: Entity[],
  slug: string,
): Entity | null {
  const decodedSlug = decodeURIComponent(slug).toLowerCase();

  return (
    entities.find((entity) => {
      if (!entity.entity) return false;
      const entitySlug = createEntitySlug(entity.entity);
      return entitySlug === decodedSlug;
    }) || null
  );
}

/**
 * Get display name for entity (short code or long name)
 */
export function getEntityDisplayName(entity: Entity): string {
  return entity.entity || entity.entity_long || "Unknown Entity";
}

/**
 * Convert budget array to lookup object by entity code
 */
export function createBudgetLookup(
  budgetData: BudgetEntry[],
): Record<string, number> {
  return budgetData.reduce(
    (acc, entry) => {
      acc[entry.entity] = entry.amount;
      return acc;
    },
    {} as Record<string, number>,
  );
}
