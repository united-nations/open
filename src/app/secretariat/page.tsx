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
        title="How are Secretariat entities spending?"
        description={
          <>
            Explore UN Secretariat expenses by priority area and entity. This
            simplified overview is based on data from the{" "}
            <a
              href="https://www.un.org/sites/un2.un.org/files/sg_annual_report_2025_en.pdf"
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
        <SecretariatFlows />
      </PageBody>
    </ChartSourceProvider>
  );
}
