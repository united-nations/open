import profiles from "../../config/features.json";
import { FEATURES, type Feature } from "@/lib/featureFlags";

export type SectionNavItem = {
  href: string;
  label: string;
  aliases?: readonly string[];
};

export const SYSTEM_NAV = [
  {
    href: "/system/organizations",
    label: "Organizations",
    aliases: ["/system"],
  },
  { href: "/system/contributors", label: "Contributors" },
  { href: "/system/assessments", label: "Assessments" },
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
    label: "Trust Funds",
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
