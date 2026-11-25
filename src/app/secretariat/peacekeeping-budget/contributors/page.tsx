import { RelatedDataPages } from "@/components/RelatedDataPages";
import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PeacekeepingContributorsTreemap } from "@/components/PeacekeepingContributorsTreemap";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget — Contributors",
};

export default function ContributorsPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            Assessments come from{" "}
            <PageSourceLink source="peacekeepingAssessments" />.
          </>
        }
        title="Who funds UN peacekeeping?"
        description="Explore Member States’ assessed contributions to UN peacekeeping, by country and mission. These are the amounts countries are required to pay."
      />
      <section id="peacekeeping-contributors" aria-label="Contributors">
        <PageBody>
          <PeacekeepingContributorsTreemap />
        </PageBody>
      </section>
      <SecretariatMethodologyLink page="peacekeeping-contributors" />
      <RelatedDataPages page="/secretariat/peacekeeping-budget/contributors" />
    </>
  );
}
