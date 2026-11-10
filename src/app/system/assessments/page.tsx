import { SectionHeading, ChartHeading } from "@/components/ContentHeading";
import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PageSourceLink } from "@/components/PageSources";
import { CebMethodologyLink } from "@/components/Methodology";
import { CebAssessmentsTreemap } from "@/components/CebAssessmentsTreemap";
import { CebSystemAssessmentTrends } from "@/components/CebAssessmentTrendsChart";
import { CebAssessmentOutstandingChart } from "@/components/CebAssessmentOutstandingChart";
import { CebAssessmentSidebars } from "@/components/CebAssessmentSidebars";
import { CEB_ASSESSMENTS_SECTION } from "@/lib/cebAssessments";

export const metadata: Metadata = {
  title: "UN System Assessments",
  description:
    "Explore assessments payable, payments received and reported outstanding balances by contributor and UN organization.",
};

export default function SystemAssessmentsPage() {
  return (
    <>
      <PageHeading
        title="To what extent are assessed contributions paid?"
        description={
          <>
            Assessed contributions are amounts members are required to pay under
            each organization’s rules. In practice, assessments are not always
            paid in full and on time by every member. Explore assessments
            payable and the payments organizations reported receiving, including
            payments toward earlier years. Figures come from{" "}
            <PageSourceLink source="cebAssessments" />; reported outstanding
            balances come from CEB’s financial-situation reports.
          </>
        }
      />
      <PageBody>
        <CebAssessmentSidebars />
        <section
          id={CEB_ASSESSMENTS_SECTION}
          className="scroll-mt-40 space-y-4"
          aria-labelledby="assessment-contributors-title"
        >
          <SectionHeading
            id="assessment-contributors-title"
            anchor={CEB_ASSESSMENTS_SECTION}
          >
            Assessed contributions payable and paid by member state
          </SectionHeading>
          <CebAssessmentsTreemap />
        </section>
        <section
          id="assessment-organizations"
          className="mt-12 scroll-mt-40 space-y-4 border-t border-gray-200 pt-8"
          aria-labelledby="assessment-organizations-title"
        >
          <SectionHeading
            id="assessment-organizations-title"
            anchor="assessment-organizations"
          >
            Assessed contributions receivable and received by organization
          </SectionHeading>
          <CebAssessmentsTreemap view="organizations" />
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <section
              aria-labelledby="assessment-trends-title"
              className="min-w-0 space-y-3"
            >
              <ChartHeading as="h3" id="assessment-trends-title">
                System-wide assessments and payments over time
              </ChartHeading>
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
