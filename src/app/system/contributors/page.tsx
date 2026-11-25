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
        description="Explore who funds UN organizations and how contributions change over time. See which organizations receive funding, whether contributions are assessed or voluntary, and whether they are earmarked for specific activities."
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
