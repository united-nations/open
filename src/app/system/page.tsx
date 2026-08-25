import {
  ArrowDown,
  ArrowRight,
  Banknote,
  Building2,
  FileText,
  Globe,
  Landmark,
  Layers,
  MapPin,
  Network,
  Target,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContributorsTreemap } from "@/components/ContributorsTreemap";
import { ContributorTrendsChart } from "@/components/ContributorTrendsChart";
import { CountryMap } from "@/components/CountryMap";
import { EntitiesTreemap } from "@/components/EntitiesTreemap";
import { EntityTrendsChart } from "@/components/EntityTrendsChart";
import { ExpandableCard } from "@/components/ExpandableCard";
import { QuoteBlock } from "@/components/QuoteBlock";
import { PageSectionNav } from "@/components/PageSectionNav";
import { ResourceLink } from "@/components/ResourceLink";
import { SectionBanner } from "@/components/SectionBanner";
import SDGsGrid from "@/components/SDGsGrid";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const pageSections = [
  { id: "donors", label: "Contributors" },
  { id: "entities", label: "Organizations" },
  { id: "countries", label: "Locations" },
  { id: "sdgs", label: "Goals" },
  { id: "background", label: "Background" },
] as const;

export const metadata: Metadata = {
  title: "UN System Financials",
  description:
    "Financial data from across the UN System: who contributes, which organizations are funded, where resources are deployed, and which goals they support.",
};

export default function SystemPage() {
  return (
    <>
      {/* Welcome Section */}
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-6 md:px-12 lg:px-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          Understand the financing of the UN System.
        </h1>
        <p className="text-base leading-relaxed text-gray-700 md:text-lg lg:whitespace-nowrap">
          Explore who contributes, which organizations are funded, where
          resources are deployed, and which goals they support.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href="#donors"
            className="group flex items-center gap-3 bg-gray-100 px-4 py-4 text-sm font-medium text-gray-900 transition-colors hover:bg-sky-50"
          >
            <ArrowDown
              className="size-4 shrink-0 text-un-blue transition-transform group-hover:translate-y-0.5"
              aria-hidden="true"
            />
            <span>Explore finances across the UN System</span>
          </a>
          <Link
            href="/secretariat"
            className="group flex items-center gap-3 bg-gray-100 px-4 py-4 text-sm font-medium text-gray-900 transition-colors hover:bg-sky-50"
          >
            <ArrowRight
              className="size-4 shrink-0 text-un-blue transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
            <span>Drill down on UN Secretariat finances</span>
          </Link>
        </div>
      </section>

      <PageSectionNav sections={pageSections} />

      {/* Donors Section */}
      <div className="pt-6">
        <SectionBanner
          id="donors"
          imageSrc="/images/banners/hero-banner-homepage.png"
          title="Who is contributing?"
          description="The work of the UN System is financially supported by many contributors. Explore who is contributing to the UN System, which organizations they fund, and what type of contributions they make — from assessed and voluntary core contributions to earmarked funding."
        />
      </div>
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <ContributorsTreemap />
        <p className="mt-4 text-xs text-gray-500">
          See{" "}
          <a href="#methodology" className="underline hover:text-gray-700">
            methodology
          </a>{" "}
          for important notes and limitations.
        </p>
        <div className="mt-6">
          <ExpandableCard
            title="Explore trends about contributions"
            variant="filled"
          >
            <ContributorTrendsChart />
          </ExpandableCard>
        </div>
      </section>

      {/* Entities Section */}
      <SectionBanner
        id="entities"
        imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
        title="Which organizations are funded?"
        description="The UN System comprises specialized agencies, funds, programmes, and the UN Secretariat with its departments, offices, and peacekeeping missions. Explore how funding flows to each organization, their revenue sources, and how they allocate expenses."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <EntitiesTreemap />
        <p className="mt-4 text-xs text-gray-500">
          See{" "}
          <a href="#methodology" className="underline hover:text-gray-700">
            methodology
          </a>{" "}
          for important notes and limitations.
        </p>
        <div className="mt-6">
          <ExpandableCard
            title="Explore trends about organizations"
            variant="filled"
          >
            <EntityTrendsChart />
          </ExpandableCard>
        </div>
      </section>

      {/* Countries Section */}
      <SectionBanner
        id="countries"
        imageSrc="/images/banners/hero-banner-system-revenue.png"
        title="Where are funds spent?"
        description="UN System organizations implement activities across the world. Explore where funds are spent geographically, from global programmes to country-level operations."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <CountryMap />
        <p className="mt-4 text-xs text-gray-500">
          See{" "}
          <a href="#methodology" className="underline hover:text-gray-700">
            methodology
          </a>{" "}
          for important notes and limitations.
        </p>
      </section>

      {/* SDGs Section */}
      <SectionBanner
        id="sdgs"
        imageSrc="/images/banners/hero-banner-system-expenses.png"
        title="Which goals are funds spent towards?"
        description="UN funding supports the 2030 Agenda for Sustainable Development. Explore how spending aligns with the 17 Sustainable Development Goals, from ending poverty to climate action."
      />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <SDGsGrid />
        <p className="mt-4 text-xs text-gray-500">
          See{" "}
          <a href="#methodology" className="underline hover:text-gray-700">
            methodology
          </a>{" "}
          for important notes and limitations.
        </p>
      </section>

      {/* Background Section */}
      <section id="background" className="scroll-mt-28 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">Background</h2>

          <div className="divide-y divide-gray-200">
            <ExpandableCard id="methodology" title="Methodology">
              <div className="space-y-4">
                <p>
                  Data is sourced from the{" "}
                  <a
                    href="https://unsceb.org/financial-statistics"
                    className="underline hover:text-un-blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    UN Chief Executives Board (CEB) financial statistics
                  </a>{" "}
                  database, covering 48 UN System organizations. CEB data comes
                  from audited financial statements aligned with the{" "}
                  <a
                    href="https://unsceb.org/data-standards-united-nations-system-wide-reporting-financial-data"
                    className="underline hover:text-un-blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Data Standards for UN System-Wide Reporting of Financial
                    Data
                  </a>
                  .
                </p>
                <p>
                  For enhanced granularity, UN Secretariat expenses are
                  integrated from the{" "}
                  <a
                    href="https://www.un.org/annualreport/"
                    className="underline hover:text-un-blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    UN Secretariat Annual Report
                  </a>
                  , sourced from data published in the{" "}
                  <a
                    href="https://results.un.org/"
                    className="underline hover:text-un-blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    UN Secretariat Programme Budget
                  </a>{" "}
                  and audited financial statements. This allows expenses to be
                  viewed by organizational entity within the UN Secretariat.
                </p>

                <h4 className="mt-6 font-medium text-gray-900">Revenue Data</h4>
                <p className="text-sm">
                  Revenue figures combine CEB data on government and
                  non-government contributors. For 2021 onwards, contributors
                  are categorized by type (Governments, Foundations, Private
                  Sector, Multilateral Organizations, etc.) using the CEB&apos;s
                  contributor classification system. For earlier years,
                  contributor categories are partially available. Where specific
                  donors are not identified, contributions are shown as
                  aggregated totals (e.g., &ldquo;Other Foundations&rdquo;).
                </p>

                <h4 className="mt-6 font-medium text-gray-900">
                  Expenses Data
                </h4>
                <p className="text-sm">
                  Expenses figures use CEB data as the primary source, covering
                  48+ UN entities. For years 2019-2023, we integrate UN
                  Secretariat data to break down the &ldquo;UN&rdquo; and
                  &ldquo;UN-DPO&rdquo; aggregates into their constituent
                  departments and peacekeeping missions (150+ sub-entities).
                  Note that CEB figures aggregate individual entity statements
                  without adjusting for inter-agency transfers, while
                  Secretariat data is consolidated and eliminates internal
                  transfers, resulting in slightly lower but more accurate
                  totals.
                </p>

                <h4 className="mt-6 font-medium text-gray-900">Notes</h4>
                <ol className="list-inside list-decimal space-y-2 text-sm">
                  <li>
                    Under the leadership of the Chief Executives Board for
                    Coordination (CEB), the UN has made significant improvements
                    to financial data standardization and reporting over the
                    past few years. For this reason, results are not perfectly
                    comparable year-to-year.
                  </li>
                  <li>
                    The number of entities reporting in each period has
                    increased over the past years, and thus the total reported
                    revenue has increased too.
                  </li>
                  <li>
                    The classification of UN Grant revenue instruments has
                    changed over time. For comparability purposes,
                    &ldquo;voluntary contributions pending earmarking&rdquo;
                    grants have been categorized as &ldquo;voluntary non-core
                    (earmarked) contributions&rdquo;.
                  </li>
                  <li>
                    The classification of UN System Functions has changed over
                    time. For comparability purposes, the previous
                    &ldquo;normative, treaty-related and knowledge creation
                    activities&rdquo; and &ldquo;technical cooperation&rdquo;
                    functions have been aggregated under the new &ldquo;global
                    agenda and specialised assistance&rdquo; function.
                  </li>
                  <li>
                    The allocation rules for headquarters expenditure to
                    geographies has been applied inconsistently. For
                    comparability purposes, we have assigned headquarters
                    expenses under the &ldquo;global and interregional&rdquo;
                    category rather than the country in which the expense
                    occurred.
                  </li>
                  <li>
                    The CEB data set classified all Department of Peacekeeping
                    Operations (DPO) mission expenditure under the &ldquo;global
                    and interregional&rdquo; category. We have approximately
                    allocated these expenses, to the extent possible, to the
                    country in which each mission occurred using the percentage
                    of the budget allocated to each mission as per the DPO.
                  </li>
                  <li>
                    The boundaries and names shown and the designations used on
                    any map shown do not imply official endorsement or
                    acceptance by the United Nations.
                  </li>
                </ol>

                <h4 className="mt-6 font-medium text-gray-900">
                  UN Cooperation Framework Data
                </h4>
                <p className="text-sm">
                  This site also displays data from the{" "}
                  <a
                    href="https://uninfo.org"
                    className="underline hover:text-un-blue"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    UN Sustainable Development Cooperation Framework system
                    (UNINFO)
                  </a>
                  , which tracks planned activities at the country level.
                </p>
                <p className="mt-2 text-sm">
                  <strong>Key differences from CEB data:</strong>
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                  <li>
                    CEB: Historical actual expenditure from audited financial
                    statements
                  </li>
                  <li>
                    UNINFO: Planned resources and partial actuals for
                    Cooperation Framework activities
                  </li>
                </ul>
                <p className="mt-2 text-sm">
                  <strong>Three metrics shown:</strong>
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                  <li>Required: Total budget needed for planned activities</li>
                  <li>Available: Funding secured from donors</li>
                  <li>Spent: Actual expenditure recorded</li>
                </ul>
                <p className="mt-2 text-sm">
                  UNINFO covers approximately 120 countries with Cooperation
                  Frameworks, representing roughly 40% of total UN system
                  spending. The remainder includes headquarters operations,
                  peacekeeping missions, and global programs outside country
                  frameworks.
                </p>
              </div>
            </ExpandableCard>

            <ExpandableCard title="UN Financial Data Standards">
              <div className="space-y-4">
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex-1 space-y-4">
                    <p>
                      The <strong>UN financial data standards</strong> prescribe
                      how UN System entities must align their financial data for
                      system-wide reporting exercises. They help ensure
                      statistics on system-wide revenues and expenses can be
                      aligned, disaggregated, and compared.
                    </p>
                    <p>
                      The standards were prepared by an inter-agency working
                      group, the ad-hoc team on the UN&apos;s future data cube.
                      They were reviewed and endorsed by the{" "}
                      <a
                        href="https://unsdg.un.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-un-blue hover:underline"
                      >
                        United Nations Sustainable Development Group (UNSDG)
                      </a>{" "}
                      and the{" "}
                      <a
                        href="https://unsceb.org/high-level-committee-management-hlcm"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-un-blue hover:underline"
                      >
                        High-level Committee on Management (HLCM)
                      </a>{" "}
                      of the UN Chief Executive Board for Coordination.
                    </p>
                  </div>
                  <div className="hidden shrink-0 md:block md:w-28 lg:w-36">
                    <Image
                      src={`${basePath}/images/banners/data-standards.svg`}
                      alt="UN Data Standards illustration"
                      width={144}
                      height={144}
                      className="h-auto w-full"
                    />
                  </div>
                </div>
                <h4 className="mt-4 font-medium text-gray-900">
                  The six data standards
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
                    <div>
                      <p className="font-medium text-gray-900">UN Entity</p>
                      <p className="text-sm">
                        Determines which UN entities are included in system-wide
                        financial data reporting.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Layers className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
                    <div>
                      <p className="font-medium text-gray-900">
                        UN System Function
                      </p>
                      <p className="text-sm">
                        Defines functional areas — Development, Humanitarian,
                        Peace Operations, and Global Agenda.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Geographic Location
                      </p>
                      <p className="text-sm">
                        Defines locations (global, regions, countries) for
                        reporting and expense allocation.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Financing Instruments
                      </p>
                      <p className="text-sm">
                        Defines grant instruments — Assessed, Voluntary core,
                        Voluntary non-core, and Other revenue.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Target className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Sustainable Development Goals
                      </p>
                      <p className="text-sm">
                        Defines how financial information must be reported
                        against the 17 SDGs.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-un-blue" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Revenue by Contributor
                      </p>
                      <p className="text-sm">
                        Guides reporting of received contributions and
                        contributor types.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  <a
                    href="https://unsdg.un.org/resources/data-standards-united-nations-system-wide-reporting-financial-data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    Access the UN Financial Data Standards (UNSDG)
                  </a>
                </p>
              </div>
            </ExpandableCard>

            <ExpandableCard title="UN Funding Compact">
              <div className="space-y-4">
                <p>
                  The <strong>UN Funding Compact</strong> marks a fundamental
                  shift in how the UN and Member States enable the
                  transformative, collaborative action needed to help countries
                  achieve the{" "}
                  <a
                    href="https://sdgs.un.org/2030agenda"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    2030 Agenda
                  </a>
                  .
                </p>
                <p>
                  At the{" "}
                  <a
                    href="https://www.un.org/en/conferences/SDGSummit2023"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    UN General Assembly Summit on the SDGs
                  </a>{" "}
                  in September 2023, world leaders recognized the urgent need
                  for bold, ambitious, accelerated, just and transformative
                  action on sustainable development. The Funding Compact sets
                  out ambitious commitments by Member States and the{" "}
                  <a
                    href="https://unsdg.un.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    United Nations Sustainable Development Group
                  </a>{" "}
                  to ensure predictable and flexible funding for United Nations
                  development activities.
                </p>
                <p>
                  Achieving the SDGs by 2030 calls for transformative,
                  collaborative action. However, funding patterns have been
                  characterized by a decline in core resources relative to
                  overall funding, unpredictability, and a rising share of
                  tightly earmarked funds for specific activities.
                </p>
                <p>
                  The Funding Compact was called for by Member States in{" "}
                  <a
                    href="https://undocs.org/A/RES/72/279"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    General Assembly resolution 72/279
                  </a>
                  , responding to requests for &ldquo;whole of United
                  Nations&rdquo; approaches through{" "}
                  <a
                    href="https://undocs.org/A/RES/71/243"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    resolution 71/243
                  </a>
                  . In return, the UN development system commits to greater
                  transparency, accountability, and efficiency.
                </p>
                <p className="text-sm text-gray-500">
                  <a
                    href="https://www.un.org/ecosoc/sites/www.un.org.ecosoc/files/files/en/qcpr/SGR2019-Add%201%20-%20Funding%20Compact%20-%20Annex.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:underline"
                  >
                    Access the UN Funding Compact (PDF)
                  </a>
                </p>
              </div>
            </ExpandableCard>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <QuoteBlock
        quote="Accountability is an end in itself, because it fosters transparency, improves results, and holds our institutions to agreed standards and commitments. It is also a critical incentive for collaboration and better reporting on system-wide impact."
        attribution="Secretary-General António Guterres"
        imageSrc="/images/banners/guterres.png"
        imageAlt="Secretary-General António Guterres"
      />

      {/* Resources Section */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
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
              title="CEB Financial Statistics"
              description="Financial data from the UN Chief Executives Board for Coordination"
              href="https://unsceb.org"
              icon={Building2}
            />
            <ResourceLink
              title="UN Results"
              description="Results and achievements of the United Nations"
              href="https://results.un.org"
              icon={Target}
            />
            <ResourceLink
              title="UN SDG"
              description="United Nations Sustainable Development Group"
              href="https://unsdg.un.org"
              icon={Globe}
            />
            <ResourceLink
              title="UN Info"
              description="UN country-level planning and reporting platform"
              href="https://uninfo.org"
              icon={FileText}
            />
            <ResourceLink
              title="UN Mandates"
              description="Database of UN mandates and resolutions"
              href="https://mandates.un.org"
              icon={Landmark}
            />
          </div>
        </div>
      </section>
    </>
  );
}
