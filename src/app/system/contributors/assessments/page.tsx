import { RelatedDataPages } from "@/components/RelatedDataPages";
import { SectionHeading, ChartHeading } from "@/components/ContentHeading";
import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PageSourceLink } from "@/components/PageSources";
import { CebMethodologyLink } from "@/components/Methodology";
import { CebAssessmentsTreemap } from "@/components/CebAssessmentsTreemap";
import { CebSystemAssessmentTrends } from "@/components/CebAssessmentTrendsChart";
import { CebAssessmentOutstandingChart } from "@/components/CebAssessmentOutstandingChart";
import { CebAssessmentOutstandingTrendsChart } from "@/components/CebAssessmentOutstandingTrendsChart";
import { CebAssessmentSidebars } from "@/components/CebAssessmentSidebars";
import { CEB_ASSESSMENTS_SECTION } from "@/lib/cebAssessments";
import { SYSTEM_ASSESSMENTS_PATH } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "UN System Assessed Contributions",
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
            payments toward earlier years. Assessments and payments cover 2024
            and 2025; the outstanding-balances trend includes earlier years.
          </>
        }
        sources={
          <>
            Figures come from <PageSourceLink source="cebAssessments" />.
            Reported outstanding balances come from CEB’s financial-situation
            reports.
          </>
        }
      />
      <PageBody>
        <CebAssessmentSidebars />
        <section
          id={CEB_ASSESSMENTS_SECTION}
          className="scroll-mt-40 space-y-3"
          aria-labelledby="assessment-chart-title"
        >
          <SectionHeading
            id="assessment-chart-title"
            anchor={CEB_ASSESSMENTS_SECTION}
          >
            Assessed contributions and payments
          </SectionHeading>
          <CebAssessmentsTreemap />
          <div className="mt-8 grid items-start gap-8 border-t border-gray-200 pt-4 lg:grid-cols-2">
            <section
              aria-labelledby="assessment-trends-title"
              className="min-w-0 space-y-3"
            >
              <ChartHeading as="h3" id="assessment-trends-title">
                Reported assessments and payments over time
              </ChartHeading>
              <CebSystemAssessmentTrends />
            </section>
            <CebAssessmentOutstandingChart />
            <CebAssessmentOutstandingTrendsChart />
          </div>
        </section>
      </PageBody>
      <CebMethodologyLink extractedOutstanding />
      <RelatedDataPages page={SYSTEM_ASSESSMENTS_PATH} />
    </>
  );
}
