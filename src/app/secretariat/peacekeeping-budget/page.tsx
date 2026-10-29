import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PeacekeepingBudgetView } from "@/components/PeacekeepingBudgetView";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget",
  description:
    "Explore how peacekeeping missions spend funds and how Member States are assessed for peacekeeping operations.",
};

export default function PeacekeepingBudgetPage() {
  return (
    <SecretariatPageSourceProvider page="peacekeeping-budget">
      <PageHeading
        id="peacekeeping-spending"
        title="How do peacekeeping missions spend funds?"
        description="Explore expenditure, approved budgets and proposals by mission, location and cost class. Financial years run from July to June."
      />
      <PageBody>
        <PeacekeepingBudgetView />
      </PageBody>
      <SecretariatPageMethodology page="peacekeeping-budget" />
    </SecretariatPageSourceProvider>
  );
}
