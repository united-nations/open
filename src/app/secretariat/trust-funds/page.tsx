import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { BudgetTreemap } from "@/components/BudgetTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds",
  description:
    "Explore UN Secretariat trust-fund accounts and separately reported extrabudgetary expenditure.",
};

export default function TrustFundsPage() {
  return (
    <SecretariatPageSourceProvider page="trust-funds">
      <PageHeading
        id="trust-fund-spending"
        title="How are trust funds and other extrabudgetary resources used?"
        description="Explore UN Secretariat trust-fund schedules and separately reported resources of UNEP, UNODC, UN-Habitat and ITC."
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
      <SecretariatPageMethodology page="trust-funds" />
    </SecretariatPageSourceProvider>
  );
}
