import { FunctionDeepLinkRedirect } from "@/components/FunctionDeepLinkRedirect";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import {
  CebPageMethodology,
  GoalsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import SDGsGrid from "@/components/SDGsGrid";
import { SDGsTrendsChart } from "@/components/SDGsTrendsChart";

export const metadata: Metadata = {
  title: "UN System Goals",
  description:
    "Explore reported UN System expenditure by Sustainable Development Goal.",
};

export default function SystemGoalsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={null}
      placement="page"
    >
      <FunctionDeepLinkRedirect />
      <PageHeading
        id="sdgs"
        title="Reported expenditure by Sustainable Development Goal"
        description="Explore reported expenditure by Sustainable Development Goal. Annual snapshots are not directly comparable because reporting coverage and allocations can change."
      />
      <PageBody>
        <SDGsGrid />
        <SDGsTrendsChart />
      </PageBody>
      <CebPageMethodology>
        <GoalsMethodologyNotes />
      </CebPageMethodology>
    </ChartSourceProvider>
  );
}
