import { RelatedDataPages } from "@/components/RelatedDataPages";
import { SHOW_ADDITIONAL_TRUST_FUNDS } from "@/lib/featureFlags";
import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { TrustFundContributorsView } from "@/components/TrustFundContributorsView";

export const metadata: Metadata = {
  title: "UN Secretariat Extrabudgetary Resources — Contributors",
};

export default function ContributorsPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            Contributions and transfers come from the{" "}
            <PageSourceLink source="trustFunds" />.
            {SHOW_ADDITIONAL_TRUST_FUNDS &&
              " Separate entity figures cite their own reports."}
          </>
        }
        title="Who contributes to UN Secretariat trust funds?"
        description={
          SHOW_ADDITIONAL_TRUST_FUNDS
            ? "Explore contributions and transfers reported for UN Secretariat trust funds. Compare reported amounts by fund and contributor, or select separately reported entity data."
            : "Explore contributions and transfers reported for UN Secretariat trust funds. Compare reported amounts by fund and contributor."
        }
      />
      <section id="trust-fund-contributors" aria-label="Contributors">
        <PageBody>
          <TrustFundContributorsView />
        </PageBody>
      </section>
      <SecretariatMethodologyLink page="trust-fund-contributors" />
      <RelatedDataPages page="/secretariat/trust-funds/contributors" />
    </>
  );
}
