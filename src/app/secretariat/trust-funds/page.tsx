import type { Metadata } from "next";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import {
  Methodology,
  SecretariatMethodology,
  TrustFundsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds",
  description:
    "Explore individual UN Secretariat trust funds and their expenses.",
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
      <Methodology>
        <SecretariatMethodology />
        <TrustFundsMethodologyNotes />
      </Methodology>
    </>
  );
}
