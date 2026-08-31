import type { Metadata } from "next";
import {
  Methodology,
  SecretariatMethodology,
  SecretariatOverviewMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { SecretariatOverview } from "@/components/SecretariatOverview";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore which UN Secretariat entities spend funds toward which priority areas.",
};

export default function SecretariatPage() {
  return (
    <>
      <PageHeading
        id="priorities"
        title="How are Secretariat entities spending?"
        description="Explore UN Secretariat expenses by priority area and entity."
      />
      <PageBody>
        <SecretariatOverview />
      </PageBody>
      <Methodology>
        <SecretariatMethodology />
        <SecretariatOverviewMethodologyNotes />
      </Methodology>
    </>
  );
}
