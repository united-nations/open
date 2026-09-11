import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import {
  ProgrammeBudgetMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { RegularBudgetView } from "@/components/RegularBudgetView";

export const metadata: Metadata = {
  title: "UN Programme Budget",
  description:
    "Compare programme-budget expenditure, approved resources and proposals, and explore Member State assessments and payment status.",
};

export default function ProgrammeBudgetPage() {
  return (
    <ChartSourceProvider
      label="Proposed Programme Budget documents"
      details={
        <>
          <SecretariatMethodology />
          <ProgrammeBudgetMethodologyNotes />
        </>
      }
    >
      <PageHeading
        id="regular-budget-spending"
        title="How is the programme budget allocated?"
        description="Compare expenditure, approved resources and proposals by budget part, section and entity."
      />
      <PageBody>
        <RegularBudgetView />
      </PageBody>
    </ChartSourceProvider>
  );
}
