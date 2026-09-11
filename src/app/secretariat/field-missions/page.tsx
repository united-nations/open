import { ChartFooter } from "@/components/ChartFooter";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { FieldMissionsMap } from "@/components/FieldMissionsMap";
import {
  FieldMissionsMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN Secretariat Field Missions",
  description:
    "Explore the geographic footprint of special political missions and peacekeeping missions.",
};

export default function FieldMissionsPage() {
  return (
    <ChartSourceProvider
      label="UN Secretariat field-mission data"
      details={
        <>
          <SecretariatMethodology />
          <FieldMissionsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        id="field-missions"
        title="How are field missions spending?"
        description="Explore the geographic footprint of special political missions and peacekeeping missions, together with the resources assigned to them."
      />
      <PageBody>
        <FieldMissionsMap />
        <ChartFooter hint="Click on a mission to explore details" />
      </PageBody>
    </ChartSourceProvider>
  );
}
