import { RelatedDataPages } from "@/components/RelatedDataPages";
import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { ChartFooter } from "@/components/ChartFooter";
import { FieldMissionsMap } from "@/components/FieldMissionsMap";

export const metadata: Metadata = {
  title: "UN Secretariat Peace Operations",
  description:
    "Explore peacekeeping operations (PKO) and special political missions (SPM), with their separate peacekeeping and programme budget funding.",
};

export default function PeaceOperationsPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            Financial figures come from the{" "}
            <PageSourceLink source="annualReport" />.
          </>
        }
        id="peace-operations"
        title="How do peace operations use their resources?"
        description="Peace operations combine peacekeeping operations (PKO) and special political missions (SPM). PKO use the peacekeeping budget; SPM are funded through the programme budget (PPB), outside the peacekeeping budget. Explore their geographic footprint and expenditure together."
      />
      <PageBody>
        <FieldMissionsMap />
        <ChartFooter hint="Click on a mission to explore details" />
      </PageBody>
      <SecretariatMethodologyLink page="peace-operations" />
      <RelatedDataPages page="/secretariat/peacekeeping-budget/peace-operations" />
    </>
  );
}
