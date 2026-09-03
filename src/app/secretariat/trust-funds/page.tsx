import type { Metadata } from "next";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import {
  Methodology,
  SecretariatMethodology,
  TrustFundContributorsMethodologyNotes,
  TrustFundsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { TrustFundContributorsTreemap } from "@/components/TrustFundContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds",
  description:
    "Explore individual UN Secretariat trust funds, their expenses and recognized voluntary contributions.",
};

export default function TrustFundsPage() {
  return (
    <>
      <PageHeading
        id="trust-fund-spending"
        title="How are the trust funds spending?"
        description="Explore individual trust-fund expenses grouped by their mapped Secretariat entity."
      />
      <PageBody>
        <BudgetTreemap
          dataset="budget-trust-funds"
          hashPrefix="trust-fund"
          sectionId="trust-fund-spending"
          activeFundingSources={["extrabudgetary"]}
          trustFundLevel="fund"
        />
      </PageBody>
      <PageHeading
        id="trust-fund-contributors"
        title="Who contributes to trust funds?"
        description="Explore recognized voluntary contributions by contributor and destination fund."
      />
      <PageBody>
        <TrustFundContributorsTreemap />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <TrustFundsMethodologyNotes />
        <TrustFundContributorsMethodologyNotes />
      </Methodology>
    </>
  );
}
