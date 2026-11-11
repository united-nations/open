import { RelatedDataPages } from "@/components/RelatedDataPages";
import { SystemPageSources } from "@/components/PageSources";
import type { Metadata } from "next";
import { DeferredChart } from "@/components/DeferredChart";
import { ContributorTrendsChart } from "@/components/ContributorTrendsChart";
import { ContributorsTreemap } from "@/components/ContributorsTreemap";
import { CebMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { CebAssessmentRevenueNote } from "@/components/CebAssessmentRevenueNote";

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
        <CebAssessmentRevenueNote />
        <div className="mt-12">
          <DeferredChart
            id="contributor-trends"
            label="Load contribution trends"
          >
            <ContributorTrendsChart />
          </DeferredChart>
        </div>
      </PageBody>
      <CebMethodologyLink />
      <RelatedDataPages page="/system/contributors" />
    </>
  );
}
