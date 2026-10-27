import { HomeChartCards } from "@/components/HomeChartCards";
import {
  Building2,
  FileText,
  Globe,
  Landmark,
  Network,
  Target,
} from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { PageBody } from "@/components/PageBody";
import { ResourceLink } from "@/components/ResourceLink";
import { SYSTEM_NAV, visibleSecretariatNav } from "@/lib/navigation";

export const metadata: Metadata = {
  description:
    "Access financial information from across the UN System and the UN Secretariat. Explore contributions, organizations, locations, goals, and Secretariat budgets.",
};

export default function HomePage() {
  const sections = [
    {
      href: "/system",
      title: "UN System",
      description:
        "The UN System comprises the UN Secretariat, funds and programmes, specialized agencies, related organizations, research and training institutes, and other entities.",
      links: SYSTEM_NAV,
    },
    {
      href: "/secretariat",
      title: "UN Secretariat",
      description:
        "The UN Secretariat is part of the UN System. Next to its departments and offices it comprises peacekeeping operations and special political missions.",
      links: visibleSecretariatNav(),
    },
  ];
  const columnStyle = {
    "--card-rows": Math.max(...sections.map((section) => section.links.length)),
  } as CSSProperties;
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-6 md:px-12 lg:px-16">
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">
          Understand the financing of the UN.
        </h1>
        <p className="text-base leading-7 text-gray-700 md:text-lg">
          Explore revenue and expenditure across the UN System, and drill down
          into the budget of the UN Secretariat.
        </p>
        <div
          className="mt-8 grid grid-cols-1 gap-y-8 md:grid-cols-2 md:gap-y-3"
          style={columnStyle}
        >
          {sections.map((section) => (
            <section
              key={section.href}
              aria-labelledby={`column-${section.href.slice(1)}`}
              className="grid min-w-0 grid-cols-1 gap-y-3 md:row-span-[calc(var(--card-rows)+1)] md:grid-rows-subgrid md:first:pr-6 md:last:border-l md:last:border-gray-200 md:last:pl-6"
            >
              <div className="pb-5">
                <h2
                  id={`column-${section.href.slice(1)}`}
                  className="text-2xl font-bold text-gray-900"
                >
                  <Link href={section.href} className="hover:underline">
                    {section.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-700">
                  {section.description}
                </p>
              </div>
              <HomeChartCards links={section.links} />
            </section>
          ))}
        </div>
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
