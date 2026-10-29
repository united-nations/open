import type { Metadata } from "next";
import {
  SecretariatPageMethodology,
  SecretariatPageSourceProvider,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PeacekeepingContributorsTreemap } from "@/components/PeacekeepingContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget — Contributors",
};

export default function ContributorsPage() {
  return (
    <SecretariatPageSourceProvider page="peacekeeping-contributors">
      <PageHeading
        title="Who funds UN peacekeeping?"
        description="Explore the contributions assessed to Member States for peacekeeping budgets, by contributor and mission. These figures show assessments, not payments received."
      />
      <section id="peacekeeping-contributors" aria-label="Contributors">
        <PageBody>
          <PeacekeepingContributorsTreemap />
        </PageBody>
      </section>
      <SecretariatPageMethodology page="peacekeeping-contributors" />
    </SecretariatPageSourceProvider>
  );
}
