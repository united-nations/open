import { RelatedDataPages } from "@/components/RelatedDataPages";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
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
    <>
      <PageHeading
        id="priorities"
        title="How do UN Secretariat entities use their resources?"
        description={
          <>
            Explore UN Secretariat expenditure by priority area and entity. This
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
        <SecretariatFlows />
      </PageBody>
      <SecretariatMethodologyLink page="overview" />
      <RelatedDataPages page="/secretariat" />
    </>
  );
}
