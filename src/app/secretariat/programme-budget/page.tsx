import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { RegularBudgetView } from "@/components/RegularBudgetView";

export const metadata: Metadata = {
  title: "UN Programme Budget",
  description:
    "Compare programme-budget expenditure, approved and proposed budgets, and explore Member State assessments and payment status.",
};

export default function ProgrammeBudgetPage() {
  return (
    <SecretariatPageSourceProvider page="programme-budget">
      <PageHeading
        id="regular-budget-spending"
        title="How is the programme budget allocated?"
        description="Compare expenditure, approved and proposed budgets by budget part, section and entity."
      />
      <PageBody>
        <RegularBudgetView />
      </PageBody>
      <SecretariatPageMethodology page="programme-budget" />
    </SecretariatPageSourceProvider>
  );
}
