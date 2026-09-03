import type { Metadata } from "next";
import {
  Methodology,
  ProgrammeBudgetMethodologyNotes,
  ProgrammeBudgetContributorsMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";
import { RegularBudgetView } from "@/components/RegularBudgetView";

export const metadata: Metadata = {
  title: "UN Programme Budget",
  description:
    "Compare programme-budget expenditure, approved resources and proposals, and explore Member State assessments and payment status.",
};

export default function ProgrammeBudgetPage() {
  return (
    <>
      <PageHeading
        id="regular-budget-spending"
        title="How is the programme budget allocated?"
        description="Compare expenditure, approved resources and proposals by budget part, section and entity."
      />
      <PageBody>
        <RegularBudgetView />
      </PageBody>
      <PageHeading
        id="programme-budget-contributors"
        title="Who contributes to the programme budget?"
        description="Explore Member State assessments, paid-in-full status and the timing of payments."
      />
      <PageBody>
        <RegularBudgetContributorsTreemap />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <ProgrammeBudgetMethodologyNotes />
        <ProgrammeBudgetContributorsMethodologyNotes />
      </Methodology>
    </>
  );
}
