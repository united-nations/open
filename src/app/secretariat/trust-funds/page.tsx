import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import {
  SecretariatMethodology,
  TrustFundsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds",
  description:
    "Explore individual UN Secretariat trust funds, their expenditure, contributions and transfers.",
};

export default function TrustFundsPage() {
  return (
    <ChartSourceProvider
      label="Audited Schedules of Individual Trust Funds"
      details={
        <>
          <SecretariatMethodology />
          <TrustFundsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        id="trust-fund-spending"
        title="How are the trust funds spending?"
        description="Explore individual trust-fund expenses grouped by Secretariat entity, with unmatched funds shown under Unmapped Trust Funds."
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
    </ChartSourceProvider>
  );
}
