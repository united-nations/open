import { FunctionDeepLinkRedirect } from "@/components/FunctionDeepLinkRedirect";
import { SystemPageSources } from "@/components/PageSources";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import {
  CebMethodology,
  GoalsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import SDGsGrid from "@/components/SDGsGrid";

export const metadata: Metadata = {
  title: "UN System Goals",
  description:
    "Explore reported UN System expenditure by Sustainable Development Goal.",
};

export default function SystemGoalsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={
        <>
          <CebMethodology />
          <GoalsMethodologyNotes />
        </>
      }
    >
      <FunctionDeepLinkRedirect />
      <PageHeading
        sources={<SystemPageSources uninfo />}
        id="sdgs"
        title="Which Sustainable Development Goals do funds support?"
        description="Explore reported expenditure by Sustainable Development Goal. Annual snapshots are not directly comparable because reporting coverage and allocations can change."
      />
      <PageBody>
        <SDGsGrid />
      </PageBody>
    </ChartSourceProvider>
  );
}
