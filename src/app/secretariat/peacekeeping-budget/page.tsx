import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { PeacekeepingBudgetView } from "@/components/PeacekeepingBudgetView";
import {
  PeacekeepingBudgetMethodologyNotes,
  SecretariatMethodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget",
  description:
    "Explore how peacekeeping missions spend funds and how Member States are assessed for peacekeeping operations.",
};

export default function PeacekeepingBudgetPage() {
  return (
    <ChartSourceProvider
      label="Peacekeeping budget and performance reports"
      details={
        <>
          <SecretariatMethodology />
          <PeacekeepingBudgetMethodologyNotes />
        </>
      }
    >
      <PageHeading
        id="peacekeeping-spending"
        title="How do peacekeeping missions spend funds?"
        description="Explore expenditure, approved budgets and proposals by mission, location and cost class. Financial years run from July to June."
      />
      <PageBody>
        <PeacekeepingBudgetView />
      </PageBody>
    </ChartSourceProvider>
  );
}
