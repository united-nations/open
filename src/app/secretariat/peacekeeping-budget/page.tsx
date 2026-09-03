import type { Metadata } from "next";
import { PeacekeepingBudgetView } from "@/components/PeacekeepingBudgetView";
import {
  Methodology,
  PeacekeepingBudgetMethodologyNotes,
  PeacekeepingContributorsMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PeacekeepingContributorsTreemap } from "@/components/PeacekeepingContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget",
  description:
    "Explore how peacekeeping missions spend funds and how Member States are assessed for peacekeeping operations.",
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
      <PageHeading
        id="peacekeeping-contributors"
        title="Who contributes to peacekeeping missions?"
        description="Assessed contributions to UN peacekeeping operations."
      />
      <PageBody>
        <PeacekeepingContributorsTreemap />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <PeacekeepingBudgetMethodologyNotes />
        <PeacekeepingContributorsMethodologyNotes />
      </Methodology>
    </>
  );
}
