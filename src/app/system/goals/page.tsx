import type { Metadata } from "next";
import {
  CebMethodology,
  GoalsMethodologyNotes,
  Methodology,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import SDGsGrid from "@/components/SDGsGrid";

export const metadata: Metadata = {
  title: "UN System Goals",
  description:
    "Explore how UN System spending aligns with the 17 Sustainable Development Goals.",
};

export default function SystemGoalsPage() {
  return (
    <>
      <PageHeading
        id="sdgs"
        title="Which goals are funds spent towards?"
        description="UN funding supports the 2030 Agenda for Sustainable Development. Explore how spending aligns with the 17 Sustainable Development Goals, from ending poverty to climate action."
      />
      <PageBody>
        <SDGsGrid />
      </PageBody>
      <Methodology>
        <CebMethodology />
        <GoalsMethodologyNotes />
      </Methodology>
    </>
  );
}
