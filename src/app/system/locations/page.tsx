import { SystemPageSources } from "@/components/PageSources";
import { FunctionGeographyChart } from "@/components/FunctionGeographyChart";
import type { Metadata } from "next";
import { LocationsMap } from "@/components/LocationsMap";
import { CebMethodologyLink } from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Locations",
  description:
    "Explore where UN System funds are spent geographically, and where staff are based by country of duty station.",
};

export default function SystemLocationsPage() {
  return (
    <>
      <PageHeading
        sources={<SystemPageSources personnel uninfo />}
        id="countries"
        title="Where are funds spent and staff based?"
        description="Explore UN expenditure across countries, regions and global programmes. See where staff are based and how expenditure is divided among different areas of work."
      />
      <PageBody>
        <LocationsMap />
        <FunctionGeographyChart />
      </PageBody>
      <CebMethodologyLink uninfo personnel />
    </>
  );
}
