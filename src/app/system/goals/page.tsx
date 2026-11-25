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
        description="Explore reported expenditure across the Sustainable Development Goals. Select a goal to see which UN organizations report expenditure against it."
      />
      <PageBody>
        <SDGsGrid />
        <SDGsTrendsChart />
      </PageBody>
      <CebMethodologyLink uninfo />
    </>
  );
}
