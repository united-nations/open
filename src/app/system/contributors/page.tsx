import type { Metadata } from "next";
import { ContributorTrendsChart } from "@/components/ContributorTrendsChart";
import { ContributorsTreemap } from "@/components/ContributorsTreemap";
import {
  CebMethodology,
  ContributorsMethodologyNotes,
  Methodology,
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
    <>
      <PageHeading
        id="donors"
        title="Who is contributing?"
        description="The work of the UN System is financially supported by many contributors. Explore who is contributing to the UN System, which organizations they fund, and what type of contributions they make — from assessed and voluntary core contributions to earmarked funding."
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
      <Methodology>
        <CebMethodology />
        <ContributorsMethodologyNotes />
      </Methodology>
    </>
  );
}
