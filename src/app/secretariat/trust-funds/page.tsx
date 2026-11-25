import { RelatedDataPages } from "@/components/RelatedDataPages";
import { SHOW_ADDITIONAL_TRUST_FUNDS } from "@/lib/featureFlags";
import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { BudgetTreemap } from "@/components/BudgetTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Extrabudgetary Resources",
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
            Expenditure figures come from the{" "}
            <PageSourceLink source="trustFunds" />.
            {SHOW_ADDITIONAL_TRUST_FUNDS &&
              " Separate entity figures cite their own reports."}
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
            ? "Explore expenditure across UN Secretariat trust funds and the entities that manage them. Separate views cover resources reported by UNEP, UNODC, UN-Habitat and ITC."
            : "Trust funds support specific UN activities through contributions set aside for those purposes. Explore expenditure across funds and the Secretariat entities that manage them."
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
      <RelatedDataPages page="/secretariat/trust-funds" />
    </>
  );
}
