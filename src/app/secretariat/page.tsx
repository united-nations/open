import { FEATURES } from "@/lib/featureFlags";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import {
  SecretariatMethodology,
  SecretariatOverviewMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { SecretariatFlows } from "@/components/SecretariatFlows";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore which UN Secretariat entities spend funds toward which priority areas.",
};

export default function SecretariatPage() {
  return (
    <ChartSourceProvider
      label="UN Secretariat programme budget and financial statements"
      details={
        <>
          <SecretariatMethodology />
          <SecretariatOverviewMethodologyNotes />
        </>
      }
    >
      <PageHeading
        id="priorities"
        title="How do Secretariat entities use their resources?"
        description={
          <>
            Explore UN Secretariat expenses by priority area and entity. This
            simplified overview is based on data from the{" "}
            <a
              href="https://www.un.org/en/annualreport"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              UN Secretariat annual report
            </a>
            .
          </>
        }
      />
      <PageBody>
        <SecretariatOverview />
        <SecretariatFlows view="mechanisms" />
        {FEATURES.secretariatDetailedFlows && <SecretariatFlows />}
      </PageBody>
    </ChartSourceProvider>
  );
}
