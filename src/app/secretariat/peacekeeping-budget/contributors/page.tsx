import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { PeacekeepingContributorsTreemap } from "@/components/PeacekeepingContributorsTreemap";
import { Methodology, SecretariatMethodology, PeacekeepingContributorsMethodologyNotes } from "@/components/Methodology";

export const metadata: Metadata = { title: "UN Peacekeeping Budget — Contributors" };

export default function ContributorsPage() {
  return <>
    <section id="peacekeeping-contributors" aria-label="Contributors">
      <PageBody><PeacekeepingContributorsTreemap /></PageBody>
    </section>
    <Methodology><SecretariatMethodology /><PeacekeepingContributorsMethodologyNotes /></Methodology>
  </>;
}
