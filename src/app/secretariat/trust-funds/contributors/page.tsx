import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { TrustFundContributorsView } from "@/components/TrustFundContributorsView";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds — Contributors",
};

export default function ContributorsPage() {
  return (
    <SecretariatPageSourceProvider page="trust-fund-contributors">
      <PageHeading
        title="Who contributes to UN Secretariat trust funds?"
        description="Explore contributions and transfers from the UN Secretariat trust-fund schedules, or select separately reported entity data. Source measures and partial coverage are shown within each view."
      />
      <section id="trust-fund-contributors" aria-label="Contributors">
        <PageBody>
          <TrustFundContributorsView />
        </PageBody>
      </section>
      <SecretariatPageMethodology page="trust-fund-contributors" />
    </SecretariatPageSourceProvider>
  );
}
