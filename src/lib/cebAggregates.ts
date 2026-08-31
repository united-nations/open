import type { Entity } from "@/types";

/** CEB reports the Secretariat (including special political missions) as `UN`. */
export const CEB_UN_ENTITY: Entity = {
  entity: "UN",
  entity_long: "UN Secretariat (incl. Political Missions)",
  entity_combined: "UN Secretariat (incl. Political Missions)",
  entity_description:
    "Aggregate for the UN Secretariat including Special Political Missions. CEB reports this as a single entity. Excludes UNEP, UNODC, UN-Habitat, and ITC which report separately.",
  entity_link: "https://unsceb.org",
  entity_link_is_un_org: 1,
  system_grouping: "UN Secretariat",
  category: "CEB Aggregate",
  un_principal_organ: "General Assembly",
  un_pillar: null,
  is_ceb_member: true,
  head_of_entity_level: null,
  head_of_entity_title_specific: null,
  head_of_entity_title_general: null,
  head_of_entity_name: null,
  head_of_entity_bio: null,
  head_of_entity_headshot: null,
  global_leadership_team_url: null,
  on_display: "TRUE",
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

/** CEB reports all peacekeeping operations as `UN-DPO`. */
export const CEB_DPO_ENTITY: Entity = {
  entity: "UN-DPO",
  entity_long: "Peacekeeping Operations",
  entity_combined: "Peacekeeping Operations (UN-DPO)",
  entity_description:
    "Aggregate for UN Peacekeeping Operations. CEB reports all peacekeeping missions under this single entity.",
  entity_link: "https://peacekeeping.un.org",
  entity_link_is_un_org: 1,
  system_grouping: "Peacekeeping Operations",
  category: "CEB Aggregate",
  un_principal_organ: "Security Council",
  un_pillar: null,
  is_ceb_member: true,
  head_of_entity_level: null,
  head_of_entity_title_specific: null,
  head_of_entity_title_general: null,
  head_of_entity_name: null,
  head_of_entity_bio: null,
  head_of_entity_headshot: null,
  global_leadership_team_url: null,
  on_display: "TRUE",
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

export const CEB_AGGREGATE_ENTITIES: Entity[] = [CEB_UN_ENTITY, CEB_DPO_ENTITY];

export const SECRETARIAT_PROPER_GROUP = "UN Secretariat";
export const PEACEKEEPING_OPERATIONS_GROUP = "Peacekeeping Operations";
