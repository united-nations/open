import {
  ArrowRight,
  Building2,
  FileText,
  Globe,
  Landmark,
  Network,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageBody } from "@/components/PageBody";
import { ResourceLink } from "@/components/ResourceLink";
import { SystemCategoryTreemap } from "@/components/SystemCategoryTreemap";
import { SYSTEM_NAV, visibleSecretariatNav } from "@/lib/navigation";

export const metadata: Metadata = {
  description:
    "Access financial information from across the UN System and the UN Secretariat. Explore contributions, organizations, locations, goals, and Secretariat budgets.",
};

// Homepage wording stays local while we refine these navigation descriptions.
const HOME_LINK_DESCRIPTIONS: Record<string, string> = {
  "/system/organizations": "Funding and spending across UN organizations.",
  "/system/contributors": "Who funds the UN, and how.",
  "/system/locations": "Where funds are spent, by country and region.",
  "/system/goals": "Spending across the 17 Sustainable Development Goals.",
  "/secretariat": "Overview of Secretariat spending across funding sources.",
  "/secretariat/programme-budget": "Detailed breakdown of the regular budget and its contributors.",
  "/secretariat/peacekeeping-budget": "Detailed breakdown of the peacekeeping budget and its contributors.",
  "/secretariat/field-missions": "How are field missions spending?",
  "/secretariat/trust-funds": "Detailed breakdown of voluntary funding via trust funds.",
};

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-6 md:px-12 lg:px-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          Understand the financing of the UN.
        </h1>
        <p className="text-base leading-relaxed text-gray-700 md:text-lg">
          Explore contributions and spending across the UN System, and drill
          down into the budget of the UN Secretariat.
        </p>
        <SystemCategoryTreemap
          systemCard={
            <HomeSectionCard
              href="/system"
              title="UN System"
              links={SYSTEM_NAV}
            />
          }
          secretariatCard={
            <HomeSectionCard
              href="/secretariat"
              title="UN Secretariat"
              links={visibleSecretariatNav()}
              secretariat
            />
          }
        />
      </section>

      <PageBody className="md:py-16">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">
          Further Resources
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ResourceLink
            title="UN System Chart"
            description="Interactive organizational chart of the United Nations System"
            href="https://systemchart.un.org/"
            icon={Network}
          />
          <ResourceLink
            title="UN Mandates"
            description="Database of UN mandates and resolutions"
            href="https://mandates.un.org"
            icon={Landmark}
          />
          <ResourceLink
            title="UN Results"
            description="Results and achievements of the United Nations"
            href="https://results.un.org"
            icon={Target}
          />
          <ResourceLink
            title="CEB Financial Statistics"
            description="Financial data from the UN Chief Executives Board for Coordination"
            href="https://unsceb.org"
            icon={Building2}
          />
          <ResourceLink
            title="UN Info"
            description="UN country-level planning and reporting platform"
            href="https://uninfo.org"
            icon={FileText}
          />
          <ResourceLink
            title="UN SDG"
            description="United Nations Sustainable Development Group"
            href="https://unsdg.un.org"
            icon={Globe}
          />
        </div>
      </PageBody>
    </>
  );
}

function HomeSectionCard({
  href,
  title,
  links,
  secretariat = false,
}: {
  href: string;
  title: string;
  links: readonly { href: string; label: string }[];
  secretariat?: boolean;
}) {
  return (
    <section className={`rounded-lg border bg-white p-6 ${secretariat ? "border-un-blue" : "border-gray-700"}`}>
      <h2 className="text-xl font-bold text-gray-900">
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-2">
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              className="flex h-full min-h-12 items-center justify-between gap-4 bg-gray-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{link.label}</span>
                <span className="mt-0.5 block text-gray-600">{HOME_LINK_DESCRIPTIONS[link.href]}</span>
              </span>
              <ArrowRight className="size-6 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
