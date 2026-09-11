import { PageHeading } from "@/components/PageHeading";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { TrustFundContributorsTreemap } from "@/components/TrustFundContributorsTreemap";
import {
  SecretariatMethodology,
  TrustFundContributorsMethodologyNotes,
} from "@/components/Methodology";

export const metadata: Metadata = { title: "UN Trust Funds — Contributors" };

export default function ContributorsPage() {
  return (
    <ChartSourceProvider
      label="Audited Schedules of Individual Trust Funds"
      details={
        <>
          <SecretariatMethodology />
          <TrustFundContributorsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        title="Who contributes to UN trust funds?"
        description="Explore recognized contributions to UN Secretariat trust funds, by contributor and the entities responsible for the funds."
      />
      <section id="trust-fund-contributors" aria-label="Contributors">
        <PageBody>
          <TrustFundContributorsTreemap />
        </PageBody>
      </section>
    </ChartSourceProvider>
  );
}
