import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/featureFlags";
import { PageHeading } from "@/components/PageHeading";
import { PageBody } from "@/components/PageBody";
import { PersonnelMethodologyLink } from "@/components/Methodology";
import { PersonnelDashboard } from "@/components/PersonnelDashboard";
import { PageSourceLink } from "@/components/PageSources";

export const metadata: Metadata = {
  title: "UN System Personnel",
  description:
    "Explore UN System staff by organization, duty station, nationality, grade, gender, age and length of service using CEB personnel statistics.",
};

export default function PersonnelPage() {
  if (!FEATURES.personnel) notFound();
  return (
    <>
      <PageHeading
        id="personnel"
        title="Who works across the UN System?"
        description="Explore year-end UN System staff by organization, duty station, nationality, grade, gender, age and length of service."
        sources={
          <>
            Data from <PageSourceLink source="personnel" />.
          </>
        }
      />
      <PageBody>
        <PersonnelDashboard />
      </PageBody>
      <PersonnelMethodologyLink />
    </>
  );
}
