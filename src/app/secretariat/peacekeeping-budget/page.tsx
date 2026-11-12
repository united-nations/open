import { RelatedDataPages } from "@/components/RelatedDataPages";
import { PageSourceLink } from "@/components/PageSources";
import type { Metadata } from "next";
import { SecretariatMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";
import { PeacekeepingBudgetView } from "@/components/PeacekeepingBudgetView";

export const metadata: Metadata = {
  title: "UN Peacekeeping Budget",
  description:
    "Explore the budgets and expenditure of United Nations peacekeeping missions and support entities.",
};

export default function PeacekeepingBudgetPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            Figures come from United Nations{" "}
            <PageSourceLink source="peacekeepingDocuments" /> and General
            Assembly decisions. Learn{" "}
            <PageSourceLink source="peacekeepingFunding" />.
          </>
        }
        id="peacekeeping-spending"
        title="How are peacekeeping resources used?"
        description="Explore expenditure, approved budgets and proposals for peacekeeping missions, support offices, service centres and the support account. Financial years run from July to June."
      />
      <PageBody>
        <PeacekeepingBudgetView />
      </PageBody>
      <SecretariatMethodologyLink page="peacekeeping-budget" />
      <RelatedDataPages page="/secretariat/peacekeeping-budget" />
    </>
  );
}
