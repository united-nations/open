import { PageSourceLink, SystemPageSources } from "@/components/PageSources";
import type { Metadata } from "next";
import Link from "next/link";
import { Link as LinkIcon } from "lucide-react";
import { EntitiesTreemap } from "@/components/EntitiesTreemap";
import { SystemFlows } from "@/components/SystemFlows";
import { EntityTrendsChart } from "@/components/EntityTrendsChart";
import { CebMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { CebAssessmentsTreemap } from "@/components/CebAssessmentsTreemap";
import { CebSystemAssessmentTrends } from "@/components/CebAssessmentTrendsChart";
import { CebAssessmentOutstandingChart } from "@/components/CebAssessmentOutstandingChart";
import { CEB_ASSESSMENTS_SECTION } from "@/lib/cebAssessments";

export const metadata: Metadata = {
  title: "UN System Organizations",
  description:
    "Explore UN System organizations’ revenue and expenditure, including revenue sources and expenditure breakdowns.",
};

export default function SystemOrganizationsPage() {
  return (
    <>
      <PageHeading
        sources={<SystemPageSources />}
        id="entities"
        title="Which organizations are funded?"
        description="The UN System comprises specialized agencies, funds, programmes, and the UN Secretariat with its departments, offices, and peacekeeping missions. Explore each organization’s revenue and expenditure, including revenue sources and expenditure breakdowns."
      />
      <PageBody>
        <EntitiesTreemap />
        <div className="mt-3 max-w-3xl space-y-2 text-sm leading-relaxed text-gray-600 [&_a]:underline [&_a]:underline-offset-2">
          <p>
            The chart groups organizations using the official{" "}
            <a href="https://sdgs.un.org/sites/default/files/2025-05/un_system_chart.pdf">
              UN System Chart
            </a>
            .
          </p>
          <p>
            The World Bank Group and the International Monetary Fund (IMF) are
            part of the UN system. These are excluded from CEB financial
            statistics because their business models differ from those of most
            UN organizations. See the{" "}
            <a href="https://www.worldbank.org/en/about/annual-report/financial-summary">
              World Bank Group’s financial summary
            </a>{" "}
            and the{" "}
            <a href="https://www.imf.org/en/data/imf-finances">
              IMF’s financial reports
            </a>
            .
          </p>
          <p>
            The UN System Chart lists UNEP and UN-Habitat under Funds and
            Programmes, and their secretariats are part of the UN Secretariat.
            The International Trade Centre (ITC) is a joint agency of the UN and
            the World Trade Organization (WTO). Note that in the{" "}
            <Link href="/secretariat">UN Secretariat section</Link> of this
            portal, all three are included under UN Secretariat finances.
          </p>
          <p>
            This chart shows aggregate figures for the UN Secretariat (including
            special political missions) and for peacekeeping operations. The{" "}
            <Link href="/secretariat">UN Secretariat section</Link> provides
            figures for individual departments, offices, peacekeeping operations
            and special political missions.
          </p>
        </div>
        <div className="mt-10">
          <EntityTrendsChart />
        </div>
        <SystemFlows />
        <section
          id={CEB_ASSESSMENTS_SECTION}
          className="mt-12 scroll-mt-40 space-y-4 border-t border-gray-200 pt-8"
          aria-labelledby="ceb-assessments-title"
        >
          <h2
            id="ceb-assessments-title"
            className="group text-2xl font-bold text-gray-900"
          >
            <a
              href={`#${CEB_ASSESSMENTS_SECTION}`}
              className="underline-offset-4 hover:underline focus-visible:underline"
            >
              To what extent are assessments paid?
              <LinkIcon
                aria-hidden="true"
                className="ml-2 inline size-5 align-baseline text-gray-400 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              />
            </a>
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
            Assessed contributions are amounts members are required to pay under
            each organization’s rules. In practice, assessments are not always
            paid in full and on time by every member. This overview shows the
            amounts assessed by each organization and the payments it received
            toward that year’s assessments and earlier years’ assessments. The
            figures are based on <PageSourceLink source="cebAssessments" />.
            Reported outstanding balances come from CEB’s financial-situation
            reports and include current and prior assessment years.
          </p>
          <CebAssessmentsTreemap view="organizations" />
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <section
              aria-labelledby="ceb-assessment-trends-title"
              className="min-w-0 space-y-3"
            >
              <h3
                id="ceb-assessment-trends-title"
                className="text-lg font-medium text-gray-900"
              >
                System-wide assessments and payments over time
              </h3>
              <CebSystemAssessmentTrends />
            </section>
            <CebAssessmentOutstandingChart />
          </div>
        </section>
      </PageBody>
      <CebMethodologyLink />
    </>
  );
}
