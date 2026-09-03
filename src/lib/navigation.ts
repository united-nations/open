import { SHOW_FIELD_MISSIONS, SHOW_TRUST_FUNDS } from "@/lib/featureFlags";

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
  { href: "/system/locations", label: "Locations" },
  { href: "/system/goals", label: "Goals" },
] as const satisfies readonly SectionNavItem[];

export const SECRETARIAT_NAV = [
  { href: "/secretariat", label: "Overview" },
  { href: "/secretariat/programme-budget", label: "Programme Budget" },
  { href: "/secretariat/peacekeeping-budget", label: "Peacekeeping Budget" },
  { href: "/secretariat/field-missions", label: "Field Missions" },
  { href: "/secretariat/trust-funds", label: "Trust Funds" },
] as const satisfies readonly SectionNavItem[];

export function visibleSecretariatNav(): SectionNavItem[] {
  return SECRETARIAT_NAV.filter((item) => {
    if (item.href === "/secretariat/trust-funds") return SHOW_TRUST_FUNDS;
    if (item.href === "/secretariat/field-missions") return SHOW_FIELD_MISSIONS;
    return true;
  });
}
