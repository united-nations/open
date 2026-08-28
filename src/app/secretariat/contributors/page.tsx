import type { Metadata } from "next";
import { DataPlaceholder } from "@/components/DataPlaceholder";
import {
  Methodology,
  SecretariatContributorsMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";
import { TrustFundContributorsTreemap } from "@/components/TrustFundContributorsTreemap";
import { SHOW_TRUST_FUNDS } from "@/lib/featureFlags";

export const metadata: Metadata = {
  title: "UN Secretariat Contributors",
  description: SHOW_TRUST_FUNDS
    ? "Explore who contributes to the UN Secretariat programme budget, peacekeeping budget, and trust funds."
    : "Explore who contributes to the UN Secretariat programme budget and peacekeeping budget.",
};

export default function SecretariatContributorsPage() {
  return (
    <>
      <PageHeading
        id="programme-budget-contributors"
        title="Who contributes to the programme budget?"
        description="Explore Member State assessments, paid-in-full status and the timing of payments."
      />
      <PageBody>
        <RegularBudgetContributorsTreemap />
      </PageBody>

      <PageHeading
        id="peacekeeping-contributors"
        title="Who contributes to peacekeeping missions?"
        description="Assessed contributions to UN peacekeeping operations."
      />
      <PageBody>
        <DataPlaceholder
          type="chart"
          height="h-96"
          title="Peacekeeping contributors"
          description="Contributor data will be added here"
        />
      </PageBody>

      {SHOW_TRUST_FUNDS && (
        <>
          <PageHeading
            id="trust-fund-contributors"
            title="Who contributes to trust funds?"
            description="Explore recognized voluntary contributions by contributor and destination fund."
          />
          <PageBody>
            <TrustFundContributorsTreemap />
          </PageBody>
        </>
      )}

      <Methodology>
        <SecretariatMethodology />
        <SecretariatContributorsMethodologyNotes />
      </Methodology>
    </>
  );
}
