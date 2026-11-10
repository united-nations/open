import type { Metadata } from "next";
import { Link as LinkIcon } from "lucide-react";
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
          <h2
            id="assessment-contributors-title"
            className="group text-2xl font-bold text-gray-900"
          >
            <a
              href={`#${CEB_ASSESSMENTS_SECTION}`}
              className="underline-offset-4 hover:underline focus-visible:underline"
            >
              Assessed contributions payable and paid by member state
              <LinkIcon
                aria-hidden="true"
                className="ml-2 inline size-5 align-baseline text-gray-400 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              />
            </a>
          </h2>
          <CebAssessmentsTreemap />
        </section>
        <section
          id="assessment-organizations"
          className="mt-12 scroll-mt-40 space-y-4 border-t border-gray-200 pt-8"
          aria-labelledby="assessment-organizations-title"
        >
          <h2
            id="assessment-organizations-title"
            className="group text-2xl font-bold text-gray-900"
          >
            <a
              href="#assessment-organizations"
              className="underline-offset-4 hover:underline focus-visible:underline"
            >
              Assessed contributions receivable and received by organization
              <LinkIcon
                aria-hidden="true"
                className="ml-2 inline size-5 align-baseline text-gray-400 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              />
            </a>
          </h2>
          <CebAssessmentsTreemap view="organizations" />
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <section
              aria-labelledby="assessment-trends-title"
              className="min-w-0 space-y-3"
            >
              <h3
                id="assessment-trends-title"
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
