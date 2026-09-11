import { PageHeading } from "@/components/PageHeading";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";
import {
  SecretariatMethodology,
  ProgrammeBudgetContributorsMethodologyNotes,
} from "@/components/Methodology";

export const metadata: Metadata = {
  title: "UN Programme Budget — Contributors",
};

export default function ContributorsPage() {
  return (
    <ChartSourceProvider
      label="UN assessment circulars and regular-budget honour roll"
      details={
        <>
          <SecretariatMethodology />
          <ProgrammeBudgetContributorsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        title="Who funds the regular budget?"
        description="Explore Member States’ assessed contributions to the UN regular budget, their paid-in-full status, and payment trends over time."
      />
      <section id="programme-budget-contributors" aria-label="Contributors">
        <PageBody>
          <RegularBudgetContributorsTreemap />
        </PageBody>
      </section>
    </ChartSourceProvider>
  );
}
