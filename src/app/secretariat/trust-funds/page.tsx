import { SHOW_ADDITIONAL_TRUST_FUNDS } from "@/lib/featureFlags";
import {
  PageSourceLink,
  SeparateEntityFinancialSources,
} from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { BudgetTreemap } from "@/components/BudgetTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Trust Funds",
  description: SHOW_ADDITIONAL_TRUST_FUNDS
    ? "Explore UN Secretariat trust-fund accounts and separately reported extrabudgetary expenditure."
    : "Explore UN Secretariat trust-fund accounts and expenditure.",
};

export default function TrustFundsPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            The fund schedules come from <PageSourceLink source="trustFunds" />.
            {SHOW_ADDITIONAL_TRUST_FUNDS ? (
              " Separate entity reports are linked on their figures."
            ) : (
              <>
                {" "}
                <SeparateEntityFinancialSources />
              </>
            )}
          </>
        }
        id="trust-fund-spending"
        title={
          SHOW_ADDITIONAL_TRUST_FUNDS
            ? "How are trust funds and other extrabudgetary resources used?"
            : "How are UN Secretariat trust funds used?"
        }
        description={
          SHOW_ADDITIONAL_TRUST_FUNDS
            ? "Explore UN Secretariat trust-fund schedules and separately reported resources of UNEP, UNODC, UN-Habitat and ITC."
            : "Explore expenditure reported in the UN Secretariat’s audited trust-fund schedules."
        }
      />
      <PageBody>
        <BudgetTreemap
          dataset="budget-trust-funds"
          hashPrefix="trust-fund"
          activeFundingSources={["extrabudgetary"]}
          trustFundLevel="fund"
        />
      </PageBody>
      <SecretariatMethodologyLink page="trust-funds" />
    </>
  );
}
