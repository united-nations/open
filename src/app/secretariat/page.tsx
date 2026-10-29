import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { FEATURES } from "@/lib/featureFlags";
import { SecretariatFlows } from "@/components/SecretariatFlows";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore which UN Secretariat entities spend funds toward which priority areas.",
};

export default function SecretariatPage() {
  return (
    <SecretariatPageSourceProvider page="overview">
      <PageHeading
        id="priorities"
        title="How do Secretariat entities use their resources?"
        description="Explore UN Secretariat expenditure by priority area and entity."
      />
      <PageBody>
        <SecretariatOverview />
        <SecretariatFlows view="mechanisms" />
        {FEATURES.secretariatDetailedFlows && <SecretariatFlows />}
      </PageBody>
      <SecretariatPageMethodology page="overview" />
    </SecretariatPageSourceProvider>
  );
}
