import { PageHeading } from "@/components/PageHeading";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { PageBody } from "@/components/PageBody";
import { PeacekeepingContributorsTreemap } from "@/components/PeacekeepingContributorsTreemap";
import {
  SecretariatMethodology,
  PeacekeepingContributorsMethodologyNotes,
} from "@/components/Methodology";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget — Contributors",
};

export default function ContributorsPage() {
  return (
    <ChartSourceProvider
      label="UN peacekeeping assessment circulars"
      details={
        <>
          <SecretariatMethodology />
          <PeacekeepingContributorsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        title="Who funds UN peacekeeping?"
        description="Explore the contributions assessed to Member States for peacekeeping budgets, by contributor and mission. These figures show assessments, not payments received."
      />
      <section id="peacekeeping-contributors" aria-label="Contributors">
        <PageBody>
          <PeacekeepingContributorsTreemap />
        </PageBody>
      </section>
    </ChartSourceProvider>
  );
}
