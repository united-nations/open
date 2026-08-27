import type { Metadata } from "next";
import { FieldMissionsMap } from "@/components/FieldMissionsMap";
import {
  FieldMissionsMethodologyNotes,
  Methodology,
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
    <>
      <PageHeading
        id="field-missions"
        title="How are field missions spending?"
        description="Explore the geographic footprint of special political missions and peacekeeping missions, together with the resources assigned to them."
      />
      <PageBody>
        <FieldMissionsMap />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <FieldMissionsMethodologyNotes />
      </Methodology>
    </>
  );
}
