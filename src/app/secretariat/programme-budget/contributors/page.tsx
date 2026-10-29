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
        title="Who funds the regular budget?"
        description="Explore Member States’ assessed contributions to the UN regular budget, their paid-in-full status, and payment trends over time."
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
