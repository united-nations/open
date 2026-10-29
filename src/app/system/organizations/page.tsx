import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { EntitiesTreemap } from "@/components/EntitiesTreemap";
import { SystemFlows } from "@/components/SystemFlows";
import { EntityTrendsChart } from "@/components/EntityTrendsChart";
import {
  CebPageMethodology,
  OrganizationsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Organizations",
  description:
    "Explore UN System organizations’ revenue and expenditure, including revenue sources and expenditure breakdowns.",
};

export default function SystemOrganizationsPage() {
  return (
    <ChartSourceProvider
      label="CEB financial statistics"
      details={null}
      placement="page"
    >
      <PageHeading
        id="entities"
        title="Which organizations are funded?"
        description="The UN System comprises specialized agencies, funds, programmes, and the UN Secretariat with its departments, offices, and peacekeeping missions. Explore each organization’s revenue and expenditure, including revenue sources and expenditure breakdowns."
      />
      <PageBody>
        <EntitiesTreemap />
        <div className="mt-10">
          <EntityTrendsChart />
        </div>
        <SystemFlows />
      </PageBody>
      <CebPageMethodology>
        <OrganizationsMethodologyNotes />
      </CebPageMethodology>
    </ChartSourceProvider>
  );
}
