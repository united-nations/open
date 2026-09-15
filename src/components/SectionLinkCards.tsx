import Link from "next/link";
import { ArrowRight } from "lucide-react";

const LINK_DESCRIPTIONS: Record<string, string> = {
  "/system/organizations": "Funding and spending across UN organizations.",
  "/system/contributors": "Who funds the UN System, and how.",
  "/system/locations": "Where funds are spent, by country and region.",
  "/system/goals": "Spending across the 17 Sustainable Development Goals.",
  "/secretariat": "Overview of Secretariat spending across funding sources.",
  "/secretariat/programme-budget":
    "Detailed breakdown of the regular budget and its contributors.",
  "/secretariat/peacekeeping-budget":
    "Detailed breakdown of the peacekeeping budget.",
  "/secretariat/field-missions": "How are field missions spending?",
  "/secretariat/trust-funds":
    "Detailed breakdown of voluntary funding via trust funds.",
};

export function SectionLinkCards({
  links,
  columns = 1,
}: {
  links: readonly { href: string; label: string }[];
  columns?: 1 | 3;
}) {
  return (
    <ul
      className={`mt-4 grid gap-2 ${columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"}`}
    >
      {links.map((link) => (
        <li key={link.href} className="min-w-0">
          <Link
            href={link.href}
            className="flex h-full min-h-12 items-center justify-between gap-4 bg-gray-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
          >
            <span className="min-w-0">
              <span className="block font-semibold">{link.label}</span>
              <span className="mt-0.5 block text-gray-600">
                {LINK_DESCRIPTIONS[link.href]}
              </span>
            </span>
            <ArrowRight className="size-6 shrink-0" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
