import Link from "next/link";
import { PageSourceLink, SystemPageSources } from "@/components/PageSources";
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
        sources={
          <>
            <SystemPageSources uninfo /> Duty station headcounts come from{" "}
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
        id="countries"
        title="Where are funds spent and staff based?"
        description="UN System organizations implement activities across the world. Explore expenditure from global programmes to country-level operations, and view staff by country of duty station."
      />
      <PageBody>
        <LocationsMap />
        <FunctionGeographyChart />
      </PageBody>
      <CebMethodologyLink personnel />
    </>
  );
}
