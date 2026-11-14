import profiles from "../../config/features.json";
import { FEATURES, type Feature } from "@/lib/featureFlags";

export type SectionNavItem = {
  href: string;
  label: string;
  aliases?: readonly string[];
};

export const SYSTEM_CONTRIBUTORS_PATH = "/system/contributors";
export const SYSTEM_ASSESSMENTS_PATH = `${SYSTEM_CONTRIBUTORS_PATH}/assessments`;
export const SYSTEM_CONTRIBUTOR_NAV = [
  { href: SYSTEM_CONTRIBUTORS_PATH, label: "Overview" },
  { href: SYSTEM_ASSESSMENTS_PATH, label: "Assessed Contributions" },
] as const satisfies readonly SectionNavItem[];

export const SYSTEM_NAV = [
  {
    href: "/system/organizations",
    label: "Organizations",
    aliases: ["/system"],
  },
  {
    href: SYSTEM_CONTRIBUTORS_PATH,
    label: "Contributors",
    aliases: [SYSTEM_ASSESSMENTS_PATH],
  },
  { href: "/system/locations", label: "Locations" },
  { href: "/system/functions", label: "Functions" },
  { href: "/system/goals", label: "Goals" },
  { href: "/system/personnel", label: "Personnel" },
] as const satisfies readonly SectionNavItem[];

export const SECRETARIAT_NAV = [
  { href: "/secretariat", label: "Overview" },
  {
    href: "/secretariat/programme-budget",
    label: "Programme Budget",
    aliases: ["/secretariat/programme-budget/contributors"],
  },
  {
    href: "/secretariat/peacekeeping-budget",
    label: "Peacekeeping Budget",
    aliases: [
      "/secretariat/peacekeeping-budget/contributors",
      "/secretariat/peacekeeping-budget/peace-operations",
    ],
  },
  {
    href: "/secretariat/trust-funds",
    label: "Extrabudgetary",
    aliases: ["/secretariat/trust-funds/contributors"],
  },
] as const satisfies readonly SectionNavItem[];

/** Parent availability applies to every descendant route, including future subpages. */
export function isRouteEnabled(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "");
  const routes = profiles.routes as Readonly<Record<string, Feature>>;
  return Object.entries(routes).every(
    ([route, feature]) =>
      !(path === route || path.startsWith(`${route}/`)) || FEATURES[feature],
  );
}

export function visibleSecretariatNav(): SectionNavItem[] {
  return SECRETARIAT_NAV.filter((item) => isRouteEnabled(item.href));
}

export function visibleSystemNav(): SectionNavItem[] {
  return SYSTEM_NAV.filter((item) => isRouteEnabled(item.href));
}
