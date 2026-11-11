import { RelatedDataPages } from "@/components/RelatedDataPages";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PageSourceLink } from "@/components/PageSources";
import { SecretariatFlows } from "@/components/SecretariatFlows";
import { SecretariatOverviewTrends } from "@/components/SecretariatOverviewTrends";
import { secretariatTrendRows } from "@/lib/staticTrendData";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore which UN Secretariat entities spend funds toward which priority areas.",
};

export default async function SecretariatPage() {
  const trends = await secretariatTrendRows();
  return (
    <>
      <PageHeading
        id="priorities"
        title="How do UN Secretariat entities use their resources?"
        description="Explore UN Secretariat expenditure by priority area and entity."
        sources={
          <>
            This simplified overview is based on data from the{" "}
            <PageSourceLink source="annualReport" />.
          </>
        }
      />
      <PageBody>
        <SecretariatOverview />
        <SecretariatOverviewTrends series={trends} />
        <SecretariatFlows />
      </PageBody>
      <SecretariatMethodologyLink page="overview" />
      <RelatedDataPages page="/secretariat" />
    </>
  );
}
