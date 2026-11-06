import Link from "next/link";
import { PageSourceLink, SystemPageSources } from "@/components/PageSources";
import type { Metadata } from "next";
import { ContributorTrendsChart } from "@/components/ContributorTrendsChart";
import { ContributorsTreemap } from "@/components/ContributorsTreemap";
import { CebMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { CebAssessmentsTreemap } from "@/components/CebAssessmentsTreemap";
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
            Assessments and payments
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
            Each tile is sized by the amount assessed. The dark blue fill shows
            the portion reported paid toward that year’s assessment, capped at
            each organization’s assessed amount. Grey shows assessed amounts
            with blank current-year receipts. Figures come from the{" "}
            <PageSourceLink source="cebAssessments" />.{" "}
            <Link
              href={`/about/#${CEB_ASSESSMENTS_SECTION}`}
              className="underline underline-offset-2"
            >
              Read the methodology
            </Link>
            .
          </p>
          <CebAssessmentsTreemap />
        </section>
      </PageBody>
      <CebMethodologyLink />
    </>
  );
}
