import { PageSourceLink } from "@/components/PageSources";
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
    "Explore UN Secretariat trust-fund accounts and separately reported extrabudgetary expenditure.",
};

export default function TrustFundsPage() {
  return (
    <ChartSourceProvider
      label="UN Secretariat trust-fund schedules and separate entity reports"
      details={
        <>
          <SecretariatMethodology />
          <TrustFundsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        sources={
          <>
            The fund schedules come from <PageSourceLink source="trustFunds" />.
            Separate entity reports are linked on their figures.
          </>
        }
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
    </ChartSourceProvider>
  );
}
