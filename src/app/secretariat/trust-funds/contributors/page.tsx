import { PageSourceLink } from "@/components/PageSources";
import { PageHeading } from "@/components/PageHeading";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { TrustFundContributorsView } from "@/components/TrustFundContributorsView";
import {
  SecretariatMethodology,
  TrustFundContributorsMethodologyNotes,
} from "@/components/Methodology";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds — Contributors",
};

export default function ContributorsPage() {
  return (
    <ChartSourceProvider
      label="UN Secretariat trust-fund schedules and separate contributor reports"
      details={
        <>
          <SecretariatMethodology />
          <TrustFundContributorsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        sources={
          <>
            The schedule view uses <PageSourceLink source="trustFunds" />.
            Separate entity views link their own source pages.
          </>
        }
        title="Who contributes to UN Secretariat trust funds?"
        description="Explore contributions and transfers from the UN Secretariat trust-fund schedules, or select separately reported entity data. Source measures and partial coverage are shown within each view."
      />
      <section id="trust-fund-contributors" aria-label="Contributors">
        <PageBody>
          <TrustFundContributorsView />
        </PageBody>
      </section>
    </ChartSourceProvider>
  );
}
