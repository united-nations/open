import { PageSourceLink, SystemPageSources } from "@/components/PageSources";
import type { Metadata } from "next";
import { ContributorTrendsChart } from "@/components/ContributorTrendsChart";
import { ContributorsTreemap } from "@/components/ContributorsTreemap";
import { CebMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { CebAssessmentsTreemap } from "@/components/CebAssessmentsTreemap";
import { CebSystemAssessmentTrends } from "@/components/CebAssessmentTrendsChart";
import { CEB_ASSESSMENTS_SECTION } from "@/lib/cebAssessments";

export const metadata: Metadata = {
  title: "UN System Contributors",
  description:
    "Explore who is contributing to the UN System, which organizations they fund, and what type of contributions they make.",
};

export default function SystemContributorsPage() {
  return (
    <>
      <PageHeading
        sources={<SystemPageSources />}
        id="donors"
        title="Who is contributing?"
        description="The work of the UN System is financially supported by many contributors. Explore who is contributing to the UN System, which organizations they fund, and what type of contributions they make — including assessed contributions, voluntary contributions (unearmarked), and voluntary contributions (earmarked)."
      />
      <PageBody>
        <ContributorsTreemap />
        <div className="mt-10">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Explore trends about contributions
          </h3>
          <ContributorTrendsChart />
        </div>
        <section
          id={CEB_ASSESSMENTS_SECTION}
          className="mt-12 scroll-mt-20 space-y-4 border-t border-gray-200 pt-8"
          aria-labelledby="ceb-assessments-title"
        >
          <h2
            id="ceb-assessments-title"
            className="text-2xl font-bold text-gray-900"
          >
            To what extent are assessments paid?
          </h2>
          <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-gray-600">
            <p>
              The contributions data above includes assessed contributions,
              which members are required to pay under each organization’s rules.
              In practice, assessments are not always paid in full and on time
              by every member. Under accrual accounting based on the
              International Public Sector Accounting Standards (IPSAS),
              organizations can record assessments as revenue even when some or
              all of the amount remains unpaid.
            </p>
            <p>
              This section shows the amounts assessed and the payments
              organizations reported receiving. For each year, it separates
              payments toward that year’s assessments from payments toward
              earlier years’ assessments. The figures are based on{" "}
              <PageSourceLink source="cebAssessments" />.
            </p>
          </div>
          <CebAssessmentsTreemap />
          <section
            aria-labelledby="ceb-assessment-trends-title"
            className="mt-8 space-y-3 lg:w-1/2"
          >
            <h3
              id="ceb-assessment-trends-title"
              className="text-lg font-medium text-gray-900"
            >
              System-wide assessments and payments over time
            </h3>
            <CebSystemAssessmentTrends />
          </section>
        </section>
      </PageBody>
      <CebMethodologyLink />
    </>
  );
}
