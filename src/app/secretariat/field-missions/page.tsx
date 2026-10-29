import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { ChartFooter } from "@/components/ChartFooter";
import { FieldMissionsMap } from "@/components/FieldMissionsMap";

export const metadata: Metadata = {
  title: "UN Secretariat Field Missions",
  description:
    "Explore the geographic footprint of special political missions and peacekeeping missions.",
};

export default function FieldMissionsPage() {
  return (
    <SecretariatPageSourceProvider page="field-missions">
      <PageHeading
        id="field-missions"
        title="How do field missions use their resources?"
        description="Explore the geographic footprint of special political missions and peacekeeping missions, together with the resources assigned to them."
      />
      <PageBody>
        <FieldMissionsMap />
        <ChartFooter hint="Click on a mission to explore details" />
      </PageBody>
      <SecretariatPageMethodology page="field-missions" />
    </SecretariatPageSourceProvider>
  );
}
