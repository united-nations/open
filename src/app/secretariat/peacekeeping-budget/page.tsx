import type { Metadata } from "next";
import { DataPlaceholder } from "@/components/DataPlaceholder";
import {
  Methodology,
  PeacekeepingBudgetMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget",
  description: "Explore how peacekeeping missions spend funds.",
};

export default function PeacekeepingBudgetPage() {
  return (
    <>
      <PageHeading
        id="peacekeeping-spending"
        title="How do peacekeeping missions spend funds?"
        description="A geographic view of peacekeeping mission expenditure."
      />
      <PageBody>
        <DataPlaceholder
          type="map"
          height="h-[32rem]"
          title="Peacekeeping missions map"
          description="Mission expenditure and operating locations"
        />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <PeacekeepingBudgetMethodologyNotes />
      </Methodology>
    </>
  );
}
