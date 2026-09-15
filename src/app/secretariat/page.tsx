import { SectionLinkCards } from "@/components/SectionLinkCards";
import { visibleSecretariatNav } from "@/lib/navigation";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import {
  SecretariatMethodology,
  SecretariatOverviewMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
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
      >
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-700 lg:text-base">
          You can also dive deeper into the three main funding sources of the UN
          Secretariat: the programme budget, peacekeeping budget and trust
          funds.
        </p>
        <SectionLinkCards
          columns={3}
          links={visibleSecretariatNav().filter((item) =>
            [
              "/secretariat/programme-budget",
              "/secretariat/peacekeeping-budget",
              "/secretariat/trust-funds",
            ].includes(item.href),
          )}
        />
      </PageHeading>
      <PageBody>
        <SecretariatOverview />
      </PageBody>
    </ChartSourceProvider>
  );
}
