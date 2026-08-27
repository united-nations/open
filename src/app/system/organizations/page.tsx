import type { Metadata } from "next";
import { EntitiesTreemap } from "@/components/EntitiesTreemap";
import { EntityTrendsChart } from "@/components/EntityTrendsChart";
import {
  CebMethodology,
  Methodology,
  OrganizationsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Organizations",
  description:
    "Explore how funding flows to UN System organizations, their revenue sources, and how they allocate expenses.",
};

export default function SystemOrganizationsPage() {
  return (
    <>
      <PageHeading
        id="entities"
        title="Which organizations are funded?"
        description="The UN System comprises specialized agencies, funds, programmes, and the UN Secretariat with its departments, offices, and peacekeeping missions. Explore how funding flows to each organization, their revenue sources, and how they allocate expenses."
      />
      <PageBody>
        <EntitiesTreemap />
        <div className="mt-10">
          <h3 className="mb-4 text-lg font-medium text-gray-900">
            Explore trends about organizations
          </h3>
          <EntityTrendsChart />
        </div>
      </PageBody>
      <Methodology>
        <CebMethodology />
        <OrganizationsMethodologyNotes />
      </Methodology>
    </>
  );
}
