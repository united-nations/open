import { RelatedDataPages } from "@/components/RelatedDataPages";
import { PageSourceLink, SystemPageSources } from "@/components/PageSources";
import type { Metadata } from "next";
import Link from "next/link";
import { OrganizationsOverview } from "@/components/OrganizationsOverview";
import { SystemFlows } from "@/components/SystemFlows";
import { EntityTrendsChart } from "@/components/EntityTrendsChart";
import { PersonnelWorkforceTrendsChart } from "@/components/PersonnelWorkforceTrendsChart";
import { CebMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Organizations",
  description:
    "Explore UN System organizations’ revenue and expenditure, including revenue sources, expenditure breakdowns, and staffing.",
};

export default function SystemOrganizationsPage() {
  return (
    <>
      <PageHeading
        sources={
          <>
            <SystemPageSources /> Staff data comes from{" "}
            <PageSourceLink source="personnel" />. See the{" "}
            <Link
              href="/about/#personnel-methodology"
              className="underline underline-offset-2"
            >
              personnel methodology
            </Link>
            .
          </>
        }
        id="entities"
        title="How are UN organizations funded and staffed?"
        description="The UN System comprises specialized agencies, funds, programmes, and the UN Secretariat with its departments, offices, and peacekeeping missions. Explore each organization’s revenue, expenditure, and reported staff."
      />
      <PageBody>
        <OrganizationsOverview>
          <p>
            The chart groups organizations using the official{" "}
            <a href="https://sdgs.un.org/sites/default/files/2025-05/un_system_chart.pdf">
              UN System Chart
            </a>
            .
          </p>
          <p>
            The World Bank Group and the International Monetary Fund (IMF) are
            part of the UN system. These are excluded from CEB financial
            statistics because their business models differ from those of most
            UN organizations. See the{" "}
            <a href="https://www.worldbank.org/en/about/annual-report/financial-summary">
              World Bank Group’s financial summary
            </a>{" "}
            and the{" "}
            <a href="https://www.imf.org/en/data/imf-finances">
              IMF’s financial reports
            </a>
            .
          </p>
          <p>
            The UN System Chart lists UNEP and UN-Habitat under Funds and
            Programmes, and their secretariats are part of the UN Secretariat.
            The International Trade Centre (ITC) is a joint agency of the UN and
            the World Trade Organization (WTO). Note that in the{" "}
            <Link href="/secretariat">UN Secretariat section</Link> of this
            portal, all three are included under UN Secretariat finances.
          </p>
          <p>
            This chart shows aggregate figures for the UN Secretariat (including
            special political missions) and for peacekeeping operations. The{" "}
            <Link href="/secretariat">UN Secretariat section</Link> provides
            figures for individual departments, offices, peacekeeping operations
            and special political missions.
          </p>
        </OrganizationsOverview>
        <div className="mt-12">
          <EntityTrendsChart />
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-6">
          <PersonnelWorkforceTrendsChart />
        </div>
        <SystemFlows />
      </PageBody>
      <CebMethodologyLink personnel />
      <RelatedDataPages page="/system/organizations" />
    </>
  );
}
