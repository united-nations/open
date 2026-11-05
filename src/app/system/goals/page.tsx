import { SystemPageSources } from "@/components/PageSources";
import { FunctionDeepLinkRedirect } from "@/components/FunctionDeepLinkRedirect";
import type { Metadata } from "next";
import { CebMethodologyLink } from "@/components/Methodology";
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
    <>
      <FunctionDeepLinkRedirect />
      <PageHeading
        sources={<SystemPageSources uninfo />}
        id="sdgs"
        title="Reported expenditure by Sustainable Development Goal"
        description="Explore reported expenditure by Sustainable Development Goal. Annual snapshots are not directly comparable because reporting coverage and allocations can change."
      />
      <PageBody>
        <SDGsGrid />
        <SDGsTrendsChart />
      </PageBody>
      <CebMethodologyLink />
    </>
  );
}
