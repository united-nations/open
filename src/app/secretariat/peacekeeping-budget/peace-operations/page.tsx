import { RelatedDataPages } from "@/components/RelatedDataPages";
import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
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
        description="Peace operations include peacekeeping and special political missions. Explore where they operate and compare expenditure across missions."
      />
      <PageBody>
        <FieldMissionsMap />
      </PageBody>
      <SecretariatMethodologyLink page="peace-operations" />
      <RelatedDataPages page="/secretariat/peacekeeping-budget/peace-operations" />
    </>
  );
}
