import { RelatedDataPages } from "@/components/RelatedDataPages";
import { SHOW_ADDITIONAL_TRUST_FUNDS } from "@/lib/featureFlags";
import {
  PageSourceLink,
  SeparateEntityFinancialSources,
} from "@/components/PageSources";
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
            The schedule view uses <PageSourceLink source="trustFunds" />.
            {SHOW_ADDITIONAL_TRUST_FUNDS ? (
              " Separate entity views link their own source pages."
            ) : (
              <>
                {" "}
                <SeparateEntityFinancialSources />
              </>
            )}
          </>
        }
        title="Who contributes to UN Secretariat trust funds?"
        description={
          SHOW_ADDITIONAL_TRUST_FUNDS
            ? "Explore contributions and transfers from the UN Secretariat trust-fund schedules, or select separately reported entity data. Source measures and partial coverage are shown within each view."
            : "Explore contributions and transfers reported in the UN Secretariat trust-fund schedules."
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
