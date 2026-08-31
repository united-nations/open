import type { Metadata } from "next";
import { PeacekeepingBudgetView } from "@/components/PeacekeepingBudgetView";
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
        description="Peacekeeping budget expenditure by mission, location and cost class."
      />
      <PageBody>
        <PeacekeepingBudgetView />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <PeacekeepingBudgetMethodologyNotes />
      </Methodology>
    </>
  );
}
