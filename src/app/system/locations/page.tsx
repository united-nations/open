import { SystemPageSources } from "@/components/PageSources";
import { SHOW_UNINFO } from "@/lib/featureFlags";
import { ChartSourceProvider } from "@/components/ChartSource";
import type { Metadata } from "next";
import { CountryMap } from "@/components/CountryMap";
import {
  CebMethodology,
  LocationsMethodologyNotes,
} from "@/components/Methodology";
import { PageBody } from "@/components/PageBody";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "UN System Locations",
  description:
    "Explore where UN System funds are spent geographically, from global programmes to country-level operations.",
};

export default function SystemLocationsPage() {
  return (
    <ChartSourceProvider
      label={
        SHOW_UNINFO
          ? "CEB financial statistics and UNINFO"
          : "CEB financial statistics"
      }
      details={
        <>
          <CebMethodology />
          <LocationsMethodologyNotes />
        </>
      }
    >
      <PageHeading
        sources={<SystemPageSources uninfo />}
        id="countries"
        title="Where are funds spent?"
        description="UN System organizations implement activities across the world. Explore where funds are spent geographically, from global programmes to country-level operations."
      />
      <PageBody>
        <CountryMap />
      </PageBody>
    </ChartSourceProvider>
  );
}
