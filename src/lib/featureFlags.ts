import profiles from "../../config/features.json";

export type Feature = keyof typeof profiles.public;
export type SiteVariant = "public" | "preview";

// next.config.ts validates SITE_VARIANT and embeds it for server and browser.
export const SITE_VARIANT: SiteVariant =
  process.env.NEXT_PUBLIC_SITE_VARIANT === "preview" ? "preview" : "public";
export const FEATURES: Readonly<Record<Feature, boolean>> =
  profiles[SITE_VARIANT];

export const SHOW_TRUST_FUNDS = FEATURES.trustFunds;
export const SHOW_FIELD_MISSIONS = FEATURES.fieldMissions;
export const SHOW_UNINFO = FEATURES.uninfo;
export const SHOW_UNINFO_SORT_CONTROLS =
  FEATURES.uninfo && FEATURES.uninfoSortControls;
export const SHOW_ENTITY_IMPACTS = FEATURES.entityImpacts;
export const SHOW_SIDEBAR_MINI_TREEMAP = FEATURES.budgetSidebarMiniTreemap;
