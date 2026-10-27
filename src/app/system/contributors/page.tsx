import { SystemPageSources } from "@/components/PageSources";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { ContributorTrendsChart } from "@/components/ContributorTrendsChart";
import { ContributorsTreemap } from "@/components/ContributorsTreemap";
import {
  CebMethodology,
  ContributorsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Contributors",
  description:
    "Explore who is contributing to the UN System, which organizations they fund, and what type of contributions they make.",
};

export default function SystemContributorsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={
        <>
          <CebMethodology />
          <ContributorsMethodologyNotes />
        </>
      }
    >
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
      </PageBody>
    </ChartSourceProvider>
  );
}
