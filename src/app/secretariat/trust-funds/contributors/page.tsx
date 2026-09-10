import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { TrustFundContributorsTreemap } from "@/components/TrustFundContributorsTreemap";
import { Methodology, SecretariatMethodology, TrustFundContributorsMethodologyNotes } from "@/components/Methodology";

export const metadata: Metadata = { title: "UN Trust Funds — Contributors" };

export default function ContributorsPage() {
  return <>
    <section id="trust-fund-contributors" aria-label="Contributors">
      <PageBody><TrustFundContributorsTreemap /></PageBody>
    </section>
    <Methodology><SecretariatMethodology /><TrustFundContributorsMethodologyNotes /></Methodology>
  </>;
}
