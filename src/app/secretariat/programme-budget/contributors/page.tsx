import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Programme Budget — Contributors",
};

export default function ContributorsPage() {
  return (
    <SecretariatPageSourceProvider page="programme-budget-contributors">
      <PageHeading
        sources={
          <>
            Assessment amounts come from{" "}
            <PageSourceLink source="regularAssessments" />; paid-in-full status
            and dates come from the <PageSourceLink source="honourRoll" />.
            Outstanding balances come from the{" "}
            <PageSourceLink source="financialSituation" />.
          </>
        }
        title="Who funds the regular budget?"
        description="Explore Member States’ assessed contributions to the UN regular budget, their payment status, and outstanding balances over time."
      />
      <section id="programme-budget-contributors" aria-label="Contributors">
        <PageBody>
          <RegularBudgetContributorsTreemap />
        </PageBody>
      </section>
      <SecretariatPageMethodology page="programme-budget-contributors" />
    </SecretariatPageSourceProvider>
  );
}
