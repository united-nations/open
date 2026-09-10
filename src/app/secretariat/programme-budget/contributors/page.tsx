import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { RegularBudgetContributorsTreemap } from "@/components/RegularBudgetContributorsTreemap";
import { Methodology, SecretariatMethodology, ProgrammeBudgetContributorsMethodologyNotes } from "@/components/Methodology";

export const metadata: Metadata = { title: "UN Programme Budget — Contributors" };

export default function ContributorsPage() {
  return <>
    <section id="programme-budget-contributors" aria-label="Contributors">
      <PageBody><RegularBudgetContributorsTreemap /></PageBody>
    </section>
    <Methodology><SecretariatMethodology /><ProgrammeBudgetContributorsMethodologyNotes /></Methodology>
  </>;
}
